// Tests for apps-script/ScheduleSync.gs (the Google Sheets auto-sync), run in Node.
import { describe, expect, it } from 'vitest';
import { loadSyncCore, gridModel } from '../workbook/sync-core.mjs';
import { EVENTS, FIXTURES, GRID, HOUSES } from '../workbook/data.mjs';

const core = loadSyncCore();
const events = EVENTS.map((e) => ({ name: e[0], format: e[3] }));
const byCode = Object.fromEntries(HOUSES.map((h) => [h.code, h.name]));
const clone = (x) => JSON.parse(JSON.stringify(x));

// MATCHES rows with no dates yet: every fixture, like a fresh sheet.
function fixtureRows() {
  const rows = [];
  for (const e of events) {
    if (e.format === 'Knockout') {
      FIXTURES[e.name].forEach(([a, b], i) => rows.push({ event: e.name, stage: `Semi ${i + 1}`, team1: byCode[a], team2: byCode[b] }));
      rows.push({ event: e.name, stage: 'Final', team1: '', team2: '' });
    } else rows.push({ event: e.name, stage: 'Single round', team1: '', team2: '' });
  }
  return rows.map((x, i) => ({ ...x, row: 4 + i, id: `M${i + 1}`, date: '', start: '', end: '', type: 'Sport', title: '', status: 'Scheduled' }));
}

function run(grid, rows) {
  const m = gridModel(grid);
  const layout = core.gofFindLayout(m.display);
  const read = core.gofReadGrid(m.display, m.isoDates, m.merges, layout, events, HOUSES, core.GOF.ALIASES);
  const plan = core.gofPlanSync(read.slots, rows, events);
  return { read, plan, layout };
}

// Apply a plan to rows the way the script writes MATCHES.
function apply(rows, plan) {
  const out = clone(rows).filter((x) => !plan.eventRowsToClear.includes(x.row));
  for (const u of plan.updates) Object.assign(out.find((x) => x.row === u.row), { date: u.date, start: u.start, end: u.end });
  plan.eventsToWrite.forEach((e, i) => out.push({ row: 900 + i, type: 'Event', event: '', title: e.title, date: e.date, start: e.start, end: e.end }));
  return out;
}

const synced = () => apply(fixtureRows(), run(GRID, fixtureRows()).plan);
const find = (rows, event, stage) => rows.find((x) => x.event === event && x.stage === stage);

describe('reading the grid', () => {
  it('finds the time row, Date column and 30-minute slots', () => {
    const { layout } = run(GRID, fixtureRows());
    expect(layout.headerRow).toBe(2);
    expect(layout.dateCol).toBe(1);
    expect(layout.slot).toBe(30);
    expect(layout.firstCol).toBe(3);
  });

  it('understands every label style used in SCAM\'s grid', () => {
    const p = (l) => core.gofParseLabel(l, events, HOUSES, core.GOF.ALIASES);
    expect(p('FIFA (G v S)')).toMatchObject({ kind: 'sport', event: 'FIFA', pair: ['Gryffindor', 'Slytherin'], final: false });
    expect(p('Volleyball W Finals')).toMatchObject({ kind: 'sport', event: 'Volleyball Women', final: true });
    expect(p('Football M (S v R)')).toMatchObject({ event: 'Football Men', pair: ['Slytherin', 'Ravenclaw'] });
    expect(p('TT (H v R)')).toMatchObject({ event: 'Table Tennis' });
    expect(p('BGMI (All)')).toMatchObject({ kind: 'sport', event: 'BGMI', pair: null });
    expect(p('Athletics (Relay) W')).toMatchObject({ event: 'Relay Women' });
    expect(p('Athletics (Shotput) M')).toMatchObject({ event: 'Shot Put Men' });
    expect(p('VB W (G v S)')).toMatchObject({ event: 'Volleyball Women' });
    expect(p('Litfest')).toEqual({ kind: 'event', title: 'Litfest' });
    expect(p('')).toEqual({ kind: 'event', title: 'To be announced' });
  });

  it('reports labels it cannot understand instead of guessing', () => {
    const p = (l) => core.gofParseLabel(l, events, HOUSES, core.GOF.ALIASES);
    expect(p('Pickelball (G v S)').kind).toBe('error');      // typo in sport name
    expect(p('Chess (G v X)').kind).toBe('error');           // unknown house letter
    expect(p('Chess (G v G)').kind).toBe('error');           // same house twice
    expect(p('Dodgeball').kind).toBe('error');                // knockout sport without teams / Finals
  });

  it('reads the full grid with no problems and the right times', () => {
    const { read } = run(GRID, fixtureRows());
    expect(read.problems).toEqual([]);
    const at = (label) => read.slots.find((s) => s.cell && s.event && label(s));
    const fifaFinal = at((s) => s.event === 'FIFA' && s.final);
    expect(fifaFinal).toMatchObject({ date: '2026-10-15', start: '01:30', end: '02:00' });
    const bgmi = at((s) => s.event === 'BGMI');
    expect(bgmi).toMatchObject({ start: '23:30', end: '00:30' });
    const cricket = at((s) => s.event === 'Cricket' && s.pair && s.pair.includes('Slytherin'));
    expect(cricket).toMatchObject({ date: '2026-10-21', start: '06:00', end: '' });
    const vbmFinal = at((s) => s.event === 'Volleyball Men' && s.final);
    expect(vbmFinal).toMatchObject({ start: '01:30', end: '02:30' });           // last column + 30 min
    const events_ = read.slots.filter((s) => s.kind === 'event');
    expect(events_.find((s) => s.date === '2026-10-24')).toMatchObject({ title: 'Litfest', start: '21:30', end: '00:30' });
    expect(events_.find((s) => s.date === '2026-10-14')).toMatchObject({ title: 'Opening Ceremony', start: '', end: '' });
    expect(events_.find((s) => s.date === '2026-10-27')).toMatchObject({ title: 'To be announced' });
    expect(events_.map((s) => s.title)).toContain('Verve');
  });
});

describe('planning the MATCHES update', () => {
  it('fills every scheduled fixture and flags the ones missing from the grid', () => {
    const { plan } = run(GRID, fixtureRows());
    expect(plan.problems).toEqual([]);
    expect(plan.updates.length).toBe(49);                       // 51 fixtures - 2 Dodgeball semis not in grid
    expect(plan.notes.join('\n')).toMatch(/Dodgeball Semi 1 is still not in the grid/);
    expect(plan.eventsToWrite.length).toBe(8);
  });

  it('does nothing the second time (already in sync)', () => {
    const { plan } = run(GRID, synced());
    expect(plan.updates).toEqual([]);
    expect(plan.eventRowsToClear).toEqual([]);
    expect(plan.eventsToWrite).toEqual([]);
  });

  it('moving a cell moves only that match', () => {
    const g = clone(GRID);
    const oct15 = g.rows.find((r) => r[0] === '2026-10-15')[1];
    oct15.find((s) => s[0] === 'FIFA Finals')[1] = '2:00';      // drag FIFA final 30 min later
    const { plan } = run(g, synced());
    expect(plan.updates).toEqual([{ row: find(synced(), 'FIFA', 'Final').row, date: '2026-10-15', start: '02:00', end: '02:30', label: 'FIFA Final' }]);
  });

  it('moving a semi to another day keeps its result columns untouched', () => {
    const g = clone(GRID);
    const oct18 = g.rows.find((r) => r[0] === '2026-10-18')[1];
    const moved = oct18.splice(oct18.findIndex((s) => s[0] === 'Pickleball (H v R)'), 1)[0];
    g.rows.find((r) => r[0] === '2026-10-19')[1] = [moved];     // replaces Oorja for this test
    const rows = synced();
    Object.assign(find(rows, 'Pickleball', 'Semi 1'), { status: 'Completed', winner: 'Hufflepuff' });
    const { plan } = run(g, rows);
    const u = plan.updates.find((x) => x.label === 'Pickleball Semi 1');
    expect(u).toMatchObject({ date: '2026-10-19', start: '22:30', end: '23:30' });
    expect(Object.keys(u).sort()).toEqual(['date', 'end', 'label', 'row', 'start']);   // only schedule fields
  });

  it('a match removed from the grid becomes "not scheduled", unless it already has a result', () => {
    const g = clone(GRID);
    const oct22 = g.rows.find((r) => r[0] === '2026-10-22')[1];
    g.rows.find((r) => r[0] === '2026-10-22')[1] = oct22.filter((s) => !s[0].startsWith('Chess'));
    const rows = synced();
    find(rows, 'Chess', 'Semi 1').status = 'Completed';
    const { plan } = run(g, rows);
    expect(plan.updates).toEqual([{ row: find(rows, 'Chess', 'Semi 2').row, date: '', start: '', end: '', label: 'Chess Semi 2' }]);
    expect(plan.notes.join('\n')).toMatch(/Chess Semi 1 is not in the grid but already has a result/);
  });

  it('a match placed twice is reported and only the first copy is used', () => {
    const g = clone(GRID);
    g.rows.find((r) => r[0] === '2026-10-25')[1] = [['Chess (S v G)', '23:00', 1]];
    const { plan } = run(g, synced());
    expect(plan.problems.join('\n')).toMatch(/Chess Semi 1 appears twice/);
  });

  it('renaming or adding an event rewrites only the event rows', () => {
    const g = clone(GRID);
    g.rows.find((r) => r[0] === '2026-10-27')[1] = [['Date Night', '6:00', 12]];
    const { plan } = run(g, synced());
    expect(plan.updates).toEqual([]);
    expect(plan.eventsToWrite.map((e) => e.title)).toContain('Date Night');
    expect(plan.eventsToWrite.map((e) => e.title)).not.toContain('To be announced');
  });

  it('reads a day that uses two grid rows with its Date cell merged down (parallel matches)', () => {
    // Like SCAM's Oct 22: Chess in the top row, the Dodgeball semis in a second row at the same times.
    const m = gridModel(GRID);
    const top = m.isoDates.indexOf('2026-10-22');
    const extra = Array(m.display[0].length).fill('');
    const col = (t) => m.firstCol + GRID.columns.indexOf(t);
    extra[col('0:30')] = 'Dodgeball (S v H)';
    extra[col('1:00')] = 'Dodgeball (G v R)';
    m.display.splice(top + 1, 0, extra);
    m.isoDates.splice(top + 1, 0, '');                         // Sheets gives no value to the merged-away date cell
    const merges = m.merges.map((x) => (x.row > top ? { ...x, row: x.row + 1 } : x));
    merges.push({ row: top, col: 1, rows: 2, cols: 1 }, { row: top, col: 2, rows: 2, cols: 1 });
    const layout = core.gofFindLayout(m.display);
    const read = core.gofReadGrid(m.display, m.isoDates, merges, layout, events, HOUSES, core.GOF.ALIASES);
    expect(read.problems).toEqual([]);
    const dodge = read.slots.filter((s) => s.event === 'Dodgeball' && !s.final);
    expect(dodge.map((s) => [s.date, s.start, s.end, s.pair.join(' v ')])).toEqual([
      ['2026-10-22', '00:30', '01:00', 'Slytherin v Hufflepuff'],
      ['2026-10-22', '01:00', '01:30', 'Gryffindor v Ravenclaw'],
    ]);
    const plan = core.gofPlanSync(read.slots, synced(), events);
    expect(plan.updates.map((u) => u.label).sort()).toEqual(['Dodgeball Semi 1', 'Dodgeball Semi 2']);
  });

  it('ignores leftover empty merged cells (only a whole-row empty merge is an event)', () => {
    const g = clone(GRID);
    g.rows.find((r) => r[0] === '2026-10-18')[1].push(['', '1:30', 2]);   // empty 2-slot merge
    const { read, plan } = run(g, synced());
    expect(read.slots.filter((s) => s.date === '2026-10-18' && s.kind === 'event')).toEqual([]);
    expect(plan.eventsToWrite).toEqual([]);
  });
});
