// Generates server/fixtures/demo.json: the workbook's computed values after a
// made-up mid-tournament scenario (night of Oct 23). Used for local development and
// whenever the site is deployed without Google Sheets credentials (shown as DEMO DATA).
//   node workbook/make-demo.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadWorkbook, serial } from './engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(here, '..', 'GOF_2026_Workbook.xlsx');
const OUT = path.join(here, '..', 'server', 'fixtures', 'demo.json');
execFileSync(process.execPath, [path.join(here, 'build.mjs'), FILE], { stdio: 'inherit' });

const wb = await loadWorkbook(FILE, { now: serial('2026-10-23', '23:45') });
const G = 'Gryffindor', S = 'Slytherin', R = 'Ravenclaw', H = 'Hufflepuff';

wb.don(G, 'Basketball Women');
wb.don(S, 'Chess');
wb.don(R, 'Volleyball Women');
wb.don(H, 'Dodgeball');
wb.set('DON', 'C4', serial('2026-10-14', '19:10'));
wb.set('DON', 'C5', serial('2026-10-14', '19:45'));
wb.set('DON', 'C6', serial('2026-10-14', '18:30'));
wb.set('DON', 'C7', serial('2026-10-14', '19:58'));

const done = (event, stage, winner, score, extra = {}) => wb.result(event, stage, { winner, score, ...extra });
done('BGMI', 'Single round', R, '', { second: H });
done('FIFA', 'Semi 1', G, '2-1');
done('FIFA', 'Semi 2', R, '2-0');
done('FIFA', 'Final', R, '2-1');
done('Pickleball', 'Semi 2', S, '11-7');
done('Badminton', 'Semi 1', R, '2-1');
done('Badminton', 'Semi 2', H, '2-0');
done('Pickleball', 'Semi 1', H, '11-9');
done('Dodgeball', 'Semi 1', H, '5-3');
done('Dodgeball', 'Semi 2', G, '4-2');
done('Volleyball Men', 'Semi 2', S, '2-1 (25-21, 19-25, 15-12)');
done('Volleyball Women', 'Semi 2', G, '2-0');
done('Cricket', 'Semi 1', S, 'S 98/4 beat G 91/7');
done('Football Women', 'Semi 2', S, '2-1');
done('Football Men', 'Semi 1', S, '3-1');
done('Volleyball Women', 'Semi 1', R, '2-1');
done('Volleyball Men', 'Semi 1', H, '2-0');
done('Cricket', 'Semi 2', H, 'H 112/6 beat R 104/9');
done('Football Women', 'Semi 1', R, '1-1 (4-3 pens)');
done('Football Men', 'Semi 2', G, '2-0');
done('Chess', 'Semi 1', G, '2-1');
done('Chess', 'Semi 2', R, '1.5-1.5 (Armageddon: R)');
done('Volleyball Men', 'Final', S, '2-0');
done('Basketball Women', 'Semi 1', H, '24-18');
wb.result('Basketball Men', 'Semi 2', { status: 'Live', score: 'Q3: G 31 - 27 H' });

wb.set('ADJUSTMENTS', 'A4', serial('2026-10-21'));
wb.set('ADJUSTMENTS', 'B4', S);
wb.set('ADJUSTMENTS', 'C4', -20);
wb.set('ADJUSTMENTS', 'D4', 'Example penalty (demo data only)');
wb.set('ADJUSTMENTS', 'E4', 'SCAM');

const sheets = {};
for (const name of ['SETUP', 'MATCHES', 'DON', 'ADJUSTMENTS', 'LEADERBOARD', 'POINTS_LOG', 'BRACKETS']) {
  sheets[name] = wb.values(name).map((row) => {
    const out = row.map((v) => (v === null ? '' : v));
    while (out.length && out[out.length - 1] === '') out.pop();   // trim like the Sheets API
    return out;
  });
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(sheets));
console.log(`Wrote ${OUT}`);
console.log(wb.standings());
