// Scoring / DON / Weasley / leaderboard / bracket tests against the REAL workbook formulas.
//   node workbook/build.mjs && node workbook/test.mjs

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadWorkbook, serial } from './engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
// GOF_WORKBOOK lets tests build to a temp file (e.g. when the real workbook is open in Excel).
const FILE = process.env.GOF_WORKBOOK || path.join(here, '..', 'GOF_2026_Workbook.xlsx');
execFileSync(process.execPath, [path.join(here, 'build.mjs'), FILE], { stdio: 'ignore' });

const NOW = serial('2026-10-15', '23:00');
let passed = 0, failed = 0;
const fresh = (now = NOW) => loadWorkbook(FILE, { now });

function eq(actual, expected, msg) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; return; }
  failed++;
  console.error(`  FAIL ${msg}\n    expected ${JSON.stringify(expected)}\n    actual   ${JSON.stringify(actual)}`);
}
async function test(name, fn) {
  console.log(`- ${name}`);
  try { await fn(); } catch (e) { failed++; console.error(`  ERROR ${e.stack}`); }
}
const totals = (wb) => Object.fromEntries(Object.entries(wb.standings()).map(([h, s]) => [h, s.total]));
const zero = { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 };
const checks = (wb) => wb.values('MATCHES').slice(3).map((r, i) => [i + 4, r[32]]).filter(([, c]) => c);

// Play out a whole knockout event: semi winners then final winner.
function knockout(wb, event, sf1Winner, sf2Winner, finalWinner, status = 'Completed') {
  wb.result(event, 'Semi 1', { winner: sf1Winner, status });
  wb.result(event, 'Semi 2', { winner: sf2Winner, status });
  wb.result(event, 'Final', { winner: finalWinner, status });
}

await test('fresh workbook: zero points, no data problems, Weasley matches found', async () => {
  const wb = await fresh();
  eq(totals(wb), zero, 'all totals 0');
  eq(checks(wb), [], 'no Check messages on seeded schedule');
  eq(wb.get('DON', 'D12'), 'Yes', 'Ravenclaw v Slytherin Football Men semi found');
  eq(wb.get('DON', 'D13'), 'Yes', 'Gryffindor v Slytherin FIFA semi found');
  eq(wb.get('DASHBOARD', 'B7'), '0 of 21', 'events decided 0 of 21');
  eq(wb.get('DASHBOARD', 'B8'), '0 of 51', 'matches completed 0 of 51');
  eq(wb.get('DASHBOARD', 'B18'), 0, 'data problems 0');
  eq(wb.get('DASHBOARD', 'B13'), '0 of 4', 'DON declared 0 of 4');
  eq(wb.get('SETUP', 'J12'), 'Football Men', 'DON options list starts with eligible events');
  eq(wb.get('SETUP', 'J26'), 'Poker', 'Poker is the 15th DON option');
  eq(wb.get('SETUP', 'J27'), '', 'only 15 DON-eligible events');
});

await test('knockout: semis feed the final; 1st = 200, 2nd = 100', async () => {
  const wb = await fresh();
  wb.result('Cricket', 'Semi 1', { winner: 'Slytherin' });            // S v G
  eq(wb.get('BRACKETS', 'I10'), 'Slytherin', 'final Team A = SF1 winner');
  eq(wb.get('BRACKETS', 'J10'), '', 'final Team B empty until SF2 done');
  wb.result('Cricket', 'Semi 2', { winner: 'Hufflepuff' });           // R v H
  eq(wb.get('BRACKETS', 'J10'), 'Hufflepuff', 'final Team B = SF2 winner');
  eq(totals(wb), zero, 'no points before the final');
  wb.result('Cricket', 'Final', { winner: 'Hufflepuff' });
  eq(totals(wb), { Gryffindor: 0, Slytherin: 100, Ravenclaw: 0, Hufflepuff: 200 }, 'final points');
  eq(wb.get('BRACKETS', 'K10'), 'Hufflepuff', 'champion');
  eq(wb.get('BRACKETS', 'L10'), 'Slytherin', 'runner-up');
  eq(wb.get('BRACKETS', 'M10'), 'Decided', 'status decided');
  eq(checks(wb), [], 'no data problems');
});

await test('e-sports/athletics use 100/50', async () => {
  const wb = await fresh();
  knockout(wb, 'FIFA', 'Gryffindor', 'Ravenclaw', 'Ravenclaw');
  wb.result('Relay Men', 'Single round', { winner: 'Hufflepuff', second: 'Slytherin' });
  // FIFA: R 100, G 50 (+50 Weasley: Gryffindor beat Slytherin in the locked semi). Relay: H 100, S 50.
  eq(totals(wb), { Gryffindor: 100, Slytherin: 50, Ravenclaw: 100, Hufflepuff: 100 }, 'totals');
});

await test('Weasley Challenge: only challenger gains/loses 50 on the locked semi', async () => {
  const wb = await fresh();
  wb.result('FIFA', 'Semi 1', { winner: 'Slytherin' });               // Gryffindor (challenger) loses
  wb.result('Football Men', 'Semi 1', { winner: 'Ravenclaw' });       // Ravenclaw (challenger) wins
  const s = wb.standings();
  eq(s.Gryffindor.weasley, -50, 'Gryffindor -50');
  eq(s.Ravenclaw.weasley, 50, 'Ravenclaw +50');
  eq(s.Slytherin.weasley, 0, 'Slytherin (challenged) unaffected');
  eq(wb.get('DON', 'F12'), 'Won', 'Ravenclaw challenge Won');
  eq(wb.get('DON', 'F13'), 'Lost', 'Gryffindor challenge Lost');
  eq(totals(wb), { Gryffindor: -50, Slytherin: 0, Ravenclaw: 50, Hufflepuff: 0 }, 'totals');
});

await test('DON: winner doubled, runner-up 0, semi loser -100 immediately', async () => {
  const wb = await fresh();
  wb.don('Hufflepuff', 'Basketball Women');   // SF1 H v G
  wb.don('Gryffindor', 'Basketball Women');   // two houses may pick the same event
  wb.don('Slytherin', 'Chess');               // SF1 S v G
  wb.don('Ravenclaw', 'Volleyball Women');    // SF1 H v R
  eq(wb.get('DON', 'F4'), 'Yes', 'Gryffindor pick valid');

  wb.result('Chess', 'Semi 1', { winner: 'Gryffindor' });           // Slytherin loses semi
  eq(wb.standings().Slytherin.don, -100, 'Slytherin -100 right after semi loss');
  eq(wb.get('DON', 'H5'), 'Out - penalty applied', 'DON result text');

  knockout(wb, 'Basketball Women', 'Hufflepuff', 'Ravenclaw', 'Ravenclaw');
  // H reaches final and loses -> 2nd -> 0 ; G lost SF1 -> -100 ; R not DON on this -> 200
  const s = wb.standings();
  eq(s.Hufflepuff.event + s.Hufflepuff.don, 0, 'Hufflepuff DON runner-up = 0 points');
  eq(s.Gryffindor.don, -100, 'Gryffindor DON semi loss = -100');

  knockout(wb, 'Volleyball Women', 'Ravenclaw', 'Gryffindor', 'Ravenclaw');
  eq(wb.standings().Ravenclaw.event + wb.standings().Ravenclaw.don, 200 + 400, 'Ravenclaw 200 (BBW) + 400 (VBW doubled)');
  eq(wb.get('DON', 'H6'), 'Won - points doubled', 'DON won text');
  eq(wb.get('DON', 'I6'), 200, 'DON effect +200');
  eq(wb.get('DASHBOARD', 'B14'), 1, 'dashboard: 1 DON won');
  eq(wb.get('DASHBOARD', 'B15'), 2, 'dashboard: 2 DON penalties');
});

await test('DON invalid picks are flagged and not applied', async () => {
  const wb = await fresh();
  wb.don('Gryffindor', 'FIFA');               // e-sports not allowed
  wb.don('Ravenclaw', 'Football Men');        // Weasley sport
  wb.don('Slytherin', 'Relay Men');           // athletics not allowed
  eq(wb.get('DON', 'H4'), 'INVALID - DON not allowed for this event', 'FIFA invalid');
  eq(wb.get('DON', 'H6'), 'INVALID - same sport as Weasley Challenge', 'Ravenclaw Football Men invalid');
  eq(wb.get('DON', 'H5'), 'INVALID - DON not allowed for this event', 'Relay invalid');
  wb.result('Football Men', 'Semi 1', { winner: 'Slytherin' });
  eq(wb.standings().Ravenclaw.don, 0, 'invalid DON never applies');
  eq(wb.standings().Ravenclaw.weasley, -50, 'but Weasley loss still applies');
});

await test('DON on single-round event (Poker): pending until decided, then -100 if not top 2', async () => {
  const wb = await fresh();
  wb.don('Hufflepuff', 'Poker');
  wb.don('Gryffindor', 'Poker');
  eq(wb.standings().Hufflepuff.don, 0, 'pending before result');
  wb.result('Poker', 'Single round', { winner: 'Gryffindor', second: 'Slytherin' });
  eq(totals(wb), { Gryffindor: 400, Slytherin: 100, Ravenclaw: 0, Hufflepuff: -100 }, 'poker totals');
});

await test('walkovers: semi walkover advances, final no-show still gets 2nd', async () => {
  const wb = await fresh();
  wb.don('Hufflepuff', 'Dodgeball');
  knockout(wb, 'Dodgeball', 'Hufflepuff', 'Gryffindor', 'Gryffindor', 'Walkover');
  eq(totals(wb), { Gryffindor: 200, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 }, 'H 2nd with DON = 0, G 200');
  const wb2 = await fresh();
  knockout(wb2, 'Dodgeball', 'Hufflepuff', 'Gryffindor', 'Gryffindor', 'Walkover');
  eq(totals(wb2).Hufflepuff, 100, 'final no-show without DON still gets 100');
});

await test('points only count when status is Completed/Walkover', async () => {
  const wb = await fresh();
  wb.result('Poker', 'Single round', { winner: 'Gryffindor', second: 'Slytherin', status: 'Live' });
  eq(totals(wb), zero, 'live result not counted');
  const r = wb.matchRow('Poker', 'Single round');
  eq(wb.get('MATCHES', `AG${r}`), 'Winner entered but Status is not Completed/Walkover - not counted yet.', 'check message');
  eq(wb.get('DASHBOARD', 'B9'), 1, 'live count 1');
  eq(wb.get('DASHBOARD', 'A22'), 'Poker', 'live list shows poker');
});

await test('data checks catch bad entries', async () => {
  const wb = await fresh();
  const r = wb.result('Chess', 'Semi 1', { winner: 'Hufflepuff' });   // H not in S v G
  eq(wb.get('MATCHES', `AG${r}`), 'Winner is not playing in this match.', 'wrong winner flagged');
  eq(totals(wb), zero, 'wrong winner gives nobody points');
  const r2 = wb.result('BGMI', 'Single round', { winner: 'Ravenclaw' });
  eq(wb.get('MATCHES', `AG${r2}`), 'Enter 2nd place.', 'missing 2nd place flagged');
  wb.set('MATCHES', `O${r2}`, 'Ravenclaw');
  eq(wb.get('MATCHES', `AG${r2}`), '1st and 2nd are the same house.', 'same house flagged');
  eq(wb.get('DASHBOARD', 'B18'), 2, 'dashboard counts 2 problems');
});

await test('leaderboard ranking and tie-breaks', async () => {
  const wb = await fresh();
  // Gryffindor: one 1st (200). Slytherin: two 2nds (100+100) -> tie on 200, Gryffindor ahead on 1sts.
  wb.result('Poker', 'Single round', { winner: 'Gryffindor', second: 'Slytherin' });
  wb.result('Chess', 'Semi 1', { winner: 'Slytherin' });
  wb.result('Chess', 'Semi 2', { winner: 'Hufflepuff' });
  wb.result('Chess', 'Final', { winner: 'Hufflepuff' });
  // G 200 (1x1st), S 200 (2x2nd), H 200 (1x1st) , R 0
  eq(totals(wb), { Gryffindor: 200, Slytherin: 200, Ravenclaw: 0, Hufflepuff: 200 }, 'totals');
  const s = wb.standings();
  eq([s.Gryffindor.rank, s.Hufflepuff.rank, s.Slytherin.rank, s.Ravenclaw.rank], [1, 1, 3, 4], 'G & H share 1st, S 3rd on 1sts tiebreak');
  eq(wb.order(), ['Gryffindor', 'Hufflepuff', 'Slytherin', 'Ravenclaw'], 'standings order');
  eq(wb.get('LEADERBOARD', 'G13'), 0, 'Slytherin is level on points with the leader');
  eq(wb.get('LEADERBOARD', 'G14'), 200, 'Ravenclaw 200 behind');
});

await test('adjustments feed the leaderboard', async () => {
  const wb = await fresh();
  wb.set('ADJUSTMENTS', 'B4', 'Slytherin'); wb.set('ADJUSTMENTS', 'C4', -50);
  wb.set('ADJUSTMENTS', 'B5', 'Hufflepuff'); wb.set('ADJUSTMENTS', 'C5', 25);
  eq(totals(wb), { Gryffindor: 0, Slytherin: -50, Ravenclaw: 0, Hufflepuff: 25 }, 'adjusted totals');
  eq(wb.order()[0], 'Hufflepuff', 'Hufflepuff leads');
});

await test('TODAY: post-midnight matches stay on the same night; 06:00 is that morning', async () => {
  const wb = await fresh(serial('2026-10-16', '01:00'));     // 1 AM after the Oct 15 night
  eq(wb.get('TODAY', 'C3'), serial('2026-10-15'), 'still the Oct 15 night at 1 AM');
  eq([6, 7, 8, 9, 10].map((r) => wb.get('TODAY', `D${r}`)),
    ['Pickleball - Semi 2', 'BGMI', 'FIFA - Semi 1', 'FIFA - Semi 2', 'FIFA - Final'], 'Oct 15 order from the grid');
  const wb2 = await fresh(serial('2026-10-21', '12:00'));
  eq(wb2.get('TODAY', 'D6'), 'Cricket - Semi 1', 'cricket 06:00 first on Oct 21');
  eq(wb2.get('TODAY', 'D9'), 'Pickleball - Final', 'Pickleball final last on Oct 21');
  const r = wb2.matchRow('FIFA', 'Final');
  eq(Math.abs(wb2.get('MATCHES', `AC${r}`) - serial('2026-10-16', '01:30')) < 1e-6, true, 'FIFA final real start = Oct 16 01:30');
  wb2.set('TODAY', 'F3', serial('2026-10-20'));
  eq(wb2.get('TODAY', 'D9'), 'Volleyball Men - Semi 1', 'VB Men H v R last on Oct 20');
  eq([wb2.get('TODAY', 'E9'), wb2.get('TODAY', 'F9')], ['Hufflepuff', 'Ravenclaw'], 'VB Men fixture H v R');
  wb2.set('TODAY', 'F3', serial('2026-10-24'));
  eq([6, 7, 8, 9].map((x) => wb2.get('TODAY', `D${x}`)), ['Cricket - Final', 'Litfest', 'Table Tennis - Semi 1', 'Poker'], 'Oct 24 order (Litfest from 21:30)');
  const dr = wb2.matchRow('Dodgeball', 'Semi 1');
  eq(wb2.get('MATCHES', `B${dr}`), null, 'Dodgeball semis not in the grid -> no date');
});

await test('full tournament simulation adds up', async () => {
  const wb = await fresh(serial('2026-11-03', '12:00'));
  const evs = wb.values('SETUP').slice(11, 32).map((r) => [r[0], r[3], r[4], r[5]]);
  let expected = { ...zero };
  for (const [ev, fmt, p1, p2] of evs) {
    if (fmt === 'Knockout') {
      const a = wb.get('BRACKETS', `C${4 + evs.findIndex((e) => e[0] === ev)}`);
      const b = wb.get('BRACKETS', `F${4 + evs.findIndex((e) => e[0] === ev)}`);
      knockout(wb, ev, a, b, a);       // Team A always wins
      expected[a] += p1; expected[b] += p2;
    } else {
      wb.result(ev, 'Single round', { winner: 'Ravenclaw', second: 'Hufflepuff' });
      expected.Ravenclaw += p1; expected.Hufflepuff += p2;
    }
  }
  // Weasley: Ravenclaw (FB Men SF1 Team A) won +50, Gryffindor (FIFA SF1 Team A) won +50
  expected.Ravenclaw += 50; expected.Gryffindor += 50;
  eq(totals(wb), expected, 'sum of all events + weasley');
  eq(wb.get('DASHBOARD', 'B7'), '21 of 21', 'all events decided');
  eq(wb.get('DASHBOARD', 'B8'), '51 of 51', 'all matches completed');
  eq(checks(wb), [], 'no data problems');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
