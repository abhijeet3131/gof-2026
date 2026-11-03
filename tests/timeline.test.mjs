// The points race must end exactly on the official totals.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { pointsTimeline } from '../src/lib/timeline.js';

const FINAL = 'public/data/final.json';

describe('pointsTimeline', () => {
  it.runIf(existsSync(FINAL))('starts at 0 and ends on each house\'s official final total', () => {
    const d = JSON.parse(readFileSync(FINAL, 'utf8'));
    const t = pointsTimeline(d);
    expect(t.nights[0]).toBe(d.meta.startDate);
    for (const s of t.series) {
      expect(s.values[0]).toBe(0);
      expect(s.values.at(-1)).toBe(d.standings.find((x) => x.house === s.house).total);
    }
  });
});
