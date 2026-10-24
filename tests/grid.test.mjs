// Tests for the full-schedule timetable layout (src/lib/grid.js).
import { describe, expect, it } from 'vitest';
import { buildGrid } from '../src/lib/grid.js';

const m = (id, night, start, end, extra = {}) => ({ id, night, start, end, type: 'Sport', event: 'X', stage: 'Semi 1', ...extra });
const days = ['2026-10-21', '2026-10-22'];

describe('buildGrid', () => {
  const grid = buildGrid([
    m('cricket', '2026-10-21', '06:00', ''),
    m('a', '2026-10-21', '22:30', '23:30'),
    m('b', '2026-10-21', '23:30', '00:30'),
    m('c', '2026-10-22', '22:30', '23:00'),
    m('d', '2026-10-22', '22:30', '23:00'),                 // parallel with c
    m('e', '2026-10-22', '01:30', '02:30'),
    { id: 'ev', night: '2026-10-21', start: '', end: '', type: 'Event', name: 'Oorja' },
  ], days);
  const col = (t) => grid.cols.findIndex((c) => c.time === t);

  it('has a morning column, a gap, then 30-minute evening columns running past midnight', () => {
    expect(grid.cols.map((c) => (c.gap ? '|' : c.time))).toEqual(['06:00', '|', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00']);
    expect(grid.cols.find((c) => c.time === '00:30').nextDay).toBe(true);
  });

  it('spans matches over their slots and stacks parallel ones', () => {
    const r21 = grid.rows[0].items, r22 = grid.rows[1].items;
    expect(r21.find((x) => x.m.id === 'b')).toMatchObject({ c0: col('23:30'), c1: col('00:30') });
    expect(r21.find((x) => x.m.id === 'cricket')).toMatchObject({ c0: 0, c1: 1 });
    expect(r21.find((x) => x.m.id === 'ev')).toMatchObject({ c0: 0, c1: grid.cols.length });   // no time: whole row
    expect(grid.rows[1].lanes).toBe(2);
    expect(r22.filter((x) => x.c0 === col('22:30')).map((x) => x.lane).sort()).toEqual([0, 1]);
    expect(r22.find((x) => x.m.id === 'e')).toMatchObject({ c0: col('01:30'), c1: grid.cols.length });
  });
});
