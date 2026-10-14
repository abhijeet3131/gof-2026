import { describe, expect, it } from 'vitest';
import { buildPayload, offsetString, readTable, serialToIso, serialToTime } from '../server/parse.mjs';
import demo from '../server/fixtures/demo.json';
import { addDays, fmtTime, nightOf, nowOverride } from '../src/lib/time.js';
import { matchState } from '../src/lib/derive.js';

const p = buildPayload(demo, { demo: true });

describe('buildPayload (demo snapshot from the real workbook formulas)', () => {
  it('reads houses, events and settings', () => {
    expect(p.houses.map((h) => h.name)).toEqual(['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff']);
    expect(p.events).toHaveLength(21);
    expect(p.events.filter((e) => e.donEligible)).toHaveLength(15);
    expect(p.meta).toMatchObject({ startDate: '2026-10-14', endDate: '2026-11-04', rolloverHour: 5, utcOffset: '+05:30' });
  });

  it('reads every scheduled row in night order with correct times', () => {
    // 51 fixtures + 8 events, minus the 2 Dodgeball semis that are not on the grid yet
    expect(p.matches).toHaveLength(57);
    expect(p.matches.some((m) => m.event === 'Dodgeball' && m.stage.startsWith('Semi'))).toBe(false);
    const fifaFinal = p.matches.find((m) => m.event === 'FIFA' && m.stage === 'Final');
    expect(fifaFinal).toMatchObject({ night: '2026-10-15', start: '01:30', startsAt: '2026-10-16T01:30:00+05:30', winner: 'Ravenclaw', second: 'Gryffindor', official: true });
    const oct21 = p.matches.filter((m) => m.night === '2026-10-21').map((m) => m.name);
    expect(oct21[0]).toBe('Cricket - Semi 1');
    expect(oct21.at(-1)).toBe('Pickleball - Final');
    const ceremony = p.matches[0];
    expect(ceremony).toMatchObject({ type: 'Event', name: 'Opening Ceremony', start: '', startsAt: '' });
  });

  it('resolves final teams from semi winners', () => {
    const vbm = p.matches.find((m) => m.event === 'Volleyball Men' && m.stage === 'Final');
    expect([vbm.teamA, vbm.teamB]).toEqual(['Hufflepuff', 'Slytherin']);
  });

  it('carries leaderboard, DON and Weasley results', () => {
    expect(p.standings.map((s) => [s.house, s.total, s.rank])).toEqual([
      ['Ravenclaw', 150, 1], ['Hufflepuff', 150, 2], ['Slytherin', 80, 3], ['Gryffindor', 0, 4],
    ]);
    expect(p.don.find((d) => d.house === 'Slytherin')).toMatchObject({ event: 'Chess', place: 'Out', effect: -100, valid: true });
    expect(p.weasley).toEqual([
      { challenger: 'Ravenclaw', challenged: 'Slytherin', event: 'Football Men', result: 'Lost', points: -50 },
      { challenger: 'Gryffindor', challenged: 'Slytherin', event: 'FIFA', result: 'Won', points: 50 },
    ]);
    expect(p.adjustments).toEqual([{ date: '2026-10-21', house: 'Slytherin', points: -20, reason: 'Example penalty (demo data only)' }]);
  });

  it('finds tables by header even when shifted', () => {
    const grid = [[], ['', 'note'], ['', '', 'House', 'Code'], ['', '', 'Gryffindor', 'G'], [], ['', '', 'other']];
    expect(readTable(grid, 'House', { untilBlank: true })).toEqual([{ House: 'Gryffindor', Code: 'G' }]);
  });
});

describe('time helpers', () => {
  it('converts serials', () => {
    expect(serialToTime(0.9375)).toBe('22:30');
    expect(serialToTime(46310.0208333333)).toBe('00:30');
    expect(offsetString(5.5)).toBe('+05:30');
    expect(serialToIso(46311.0208333333, '+05:30')).toBe('2026-10-16T00:30:00+05:30');
  });

  it('works out the tournament night with the 05:00 rollover', () => {
    expect(nightOf(new Date('2026-10-16T01:30:00+05:30'), '+05:30', 5)).toBe('2026-10-15');
    expect(nightOf(new Date('2026-10-21T06:00:00+05:30'), '+05:30', 5)).toBe('2026-10-21');
    expect(nightOf(new Date('2026-10-15T20:00:00Z'), '+05:30', 5)).toBe('2026-10-15'); // = 01:30 IST on Oct 16, independent of device timezone
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(fmtTime('00:30')).toBe('12:30 AM');
    expect(fmtTime('22:00')).toBe('10:00 PM');
  });

  it('parses the ?now= preview override', () => {
    const skew = nowOverride('?now=2026-10-23T23:45', '+05:30');
    expect(Math.abs(Date.now() + skew - Date.parse('2026-10-23T23:45:00+05:30'))).toBeLessThan(1000);
    expect(nowOverride('?now=garbage')).toBeNull();
  });

  it('derives match states', () => {
    const live = p.matches.find((m) => m.status === 'Live');
    expect(matchState(live, Date.now())).toBe('live');
    const tt = p.matches.find((m) => m.event === 'Table Tennis' && m.stage === 'Semi 1');
    expect(matchState(tt, Date.parse('2026-10-24T22:00:00+05:30'))).toBe('upcoming');   // TT Semi 1: night of Oct 24, 00:30
    expect(matchState(tt, Date.parse('2026-10-25T03:00:00+05:30'))).toBe('awaiting');
  });
});
