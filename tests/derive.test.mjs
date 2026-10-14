// Tests for the app-side views in src/lib/derive.js.
import { describe, expect, it } from 'vitest';
import { orderSemis } from '../src/lib/derive.js';

const match = (event, stage, night, sort, teamA = '', teamB = '') => ({ id: `${event}|${stage}`, event, stage, night, sort, teamA, teamB });
const get = (data, event, stage) => data.matches.find((m) => m.event === event && m.stage === stage);

describe('orderSemis: the earlier semi is always shown as Semi 1', () => {
  it('swaps the labels when the sheet\'s Semi 2 is played first, and the final\'s slots with them', () => {
    const data = { matches: [
      match('Pickleball', 'Semi 2', '2026-10-15', 1, 'Gryffindor', 'Slytherin'),
      match('Pickleball', 'Semi 1', '2026-10-18', 1, 'Hufflepuff', 'Ravenclaw'),
      match('Pickleball', 'Final', '2026-10-21', 1, 'Hufflepuff', ''),         // winner of the sheet's Semi 1 is known
    ] };
    const out = orderSemis(data);
    expect(get(out, 'Pickleball', 'Semi 1')).toMatchObject({ night: '2026-10-15', teamA: 'Gryffindor' });
    expect(get(out, 'Pickleball', 'Semi 2')).toMatchObject({ night: '2026-10-18', teamA: 'Hufflepuff' });
    expect(get(out, 'Pickleball', 'Final')).toMatchObject({ teamA: '', teamB: 'Hufflepuff' });
    expect(get(data, 'Pickleball', 'Semi 2').night).toBe('2026-10-15');        // input left untouched
  });

  it('uses the start order on the same night', () => {
    const data = { matches: [match('FIFA', 'Semi 1', '2026-10-15', 2), match('FIFA', 'Semi 2', '2026-10-15', 1)] };
    expect(get(orderSemis(data), 'FIFA', 'Semi 1').sort).toBe(1);
  });

  it('leaves events already in order, or with a semi not yet scheduled, as they are', () => {
    const data = { matches: [
      match('Chess', 'Semi 1', '2026-10-22', 1), match('Chess', 'Semi 2', '2026-10-22', 2),
      match('Dodgeball', 'Semi 2', '2026-10-22', 1),
    ] };
    expect(orderSemis(data)).toBe(data);
  });
});
