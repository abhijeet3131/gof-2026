// Tests for the app-side views in src/lib/derive.js.
import { describe, expect, it } from 'vitest';
import { derive, orderSemis, withFinalists } from '../src/lib/derive.js';

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

describe('SCAM adjustments tagged to an event ("BGMI: ...")', () => {
  const base = {
    houses: [], don: [], weasley: [], brackets: [], pointsLog: [],
    events: ['BGMI', 'Football', 'Football Men'].map((name) => ({ name })),
    matches: [{ event: 'BGMI', format: 'Single round', official: true, winner: 'Ravenclaw', second: '', night: '2026-10-15', sort: 1 }],
  };
  const adj = (house, points, reason) => ({ house, points, reason, date: '2026-10-15' });

  it('groups them by event and treats positive ones on a blank 2nd place as a tied 2nd', () => {
    const ctx = derive({ ...base, adjustments: [
      adj('Slytherin', 25, 'BGMI: joint 2nd with Hufflepuff (50 pts split)'),
      adj('Hufflepuff', 25, 'bgmi - joint 2nd with Slytherin'),
      adj('Gryffindor', -20, 'Late for opening ceremony'),
    ] });
    expect(ctx.adjByEvent.BGMI).toEqual({
      Slytherin: { points: 25, notes: ['joint 2nd with Hufflepuff (50 pts split)'] },
      Hufflepuff: { points: 25, notes: ['joint 2nd with Slytherin'] },
    });
    expect(ctx.adjTagged).toEqual({ Slytherin: 25, Hufflepuff: 25 });
    expect(ctx.adjTaggedSet.size).toBe(2);
    expect(ctx.tiedSecond).toEqual({ BGMI: ['Hufflepuff', 'Slytherin'] });
  });

  it('matches the longest event name and needs a separator after it', () => {
    const ctx = derive({ ...base, adjustments: [
      adj('Gryffindor', -10, 'Football Men: red card'),
      adj('Slytherin', 10, 'BGMI bonus for fair play'),                 // no ":" or "-" after the name -> general adjustment
    ] });
    expect(Object.keys(ctx.adjByEvent)).toEqual(['Football Men']);
    expect(ctx.tiedSecond).toEqual({});
  });
});

describe('withFinalists: semi-final winners get 2nd-place points before the final', () => {
  const houses = ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'];
  const semi = (event, stage, winner) => ({ event, stage, official: true, winner, night: '2026-10-20', sort: 1 });
  const log = (event, status = 'In progress') => houses.map((house) => ({ event, house, place: '', base: 0, donPick: false, donEffect: 0, total: 0, status }));
  const zero = (house) => ({ house, eventPoints: 0, donEffect: 0, weasley: 0, adjustments: 0, total: 0, firsts: 0, seconds: 0, rank: 1 });
  const data = (extra = {}) => ({
    events: [
      { name: 'Football Men', format: 'Knockout', points1st: 200, points2nd: 100 },
      { name: 'Chess', format: 'Knockout', points1st: 100, points2nd: 50 },
    ],
    matches: [semi('Football Men', 'Semi 1', 'Slytherin'), semi('Football Men', 'Semi 2', 'Gryffindor'), semi('Chess', 'Semi 1', 'Ravenclaw')],
    don: [], pointsLog: [...log('Football Men'), ...log('Chess')],
    houseTotals: houses.map(zero),
    standings: houses.map((house, i) => ({ position: i + 1, house, total: 0, firsts: 0, seconds: 0, rank: 1, behind: 0 })),
    ...extra,
  });

  it('adds the points, counts a 2nd place and re-ranks', () => {
    const out = withFinalists(data());
    expect(out.pointsLog.find((p) => p.event === 'Football Men' && p.house === 'Slytherin')).toMatchObject({ place: '2nd', total: 100, provisional: true });
    expect(out.houseTotals.find((t) => t.house === 'Gryffindor')).toMatchObject({ eventPoints: 100, total: 100, seconds: 1 });
    expect(out.standings.map((s) => [s.house, s.total, s.rank])).toEqual([
      ['Gryffindor', 100, 1], ['Slytherin', 100, 1], ['Ravenclaw', 50, 3], ['Hufflepuff', 0, 4],
    ]);
    expect(out.standings[2].behind).toBe(50);
  });

  it('only the house with its DON on that sport waits for the final', () => {
    const out = withFinalists(data({ don: [{ house: 'Slytherin', event: 'Football Men', valid: true }] }));
    const fm = (h) => out.pointsLog.find((p) => p.event === 'Football Men' && p.house === h);
    expect(fm('Slytherin')).toMatchObject({ place: '', total: 0 });
    expect(fm('Gryffindor')).toMatchObject({ place: '2nd', total: 100, provisional: true });
  });

  it('adds nothing once the final has been entered', () => {
    const out = withFinalists(data({ pointsLog: [...log('Football Men', 'Decided'), ...log('Chess', 'Decided')] }));
    expect(out.standings.every((s) => s.total === 0)).toBe(true);
  });
});
