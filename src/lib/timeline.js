// Night-by-night running totals for the points race chart.
// Each sport's points (DON included) land on the night its final / single round was played,
// Weasley points on the night of the challenged semi, SCAM adjustments on their date.

import { daysBetween } from './time.js';

export function pointsTimeline(data) {
  const houses = data.standings.map((s) => s.house);
  const decidedOn = {};
  for (const m of data.matches) {
    if (m.type === 'Event' || !m.official) continue;
    if (m.stage === 'Final' || m.stage === 'Single round') decidedOn[m.event] = m.night;
  }
  const add = {};                                                  // night -> house -> points
  const put = (night, house, pts) => {
    if (!night || !pts) return;
    ((add[night] ||= {})[house] = (add[night][house] || 0) + pts);
  };
  for (const p of data.pointsLog) if (p.status === 'Decided') put(decidedOn[p.event], p.house, p.total);
  for (const w of data.weasley) {
    if (w.result === 'Pending') continue;
    const semi = data.matches.find((m) => m.event === w.event && m.stage.startsWith('Semi')
      && [m.teamA, m.teamB].includes(w.challenger) && [m.teamA, m.teamB].includes(w.challenged));
    put(semi?.night, w.challenger, w.points);
  }
  for (const a of data.adjustments) put(a.date, a.house, a.points);

  const nights = Object.keys(add).sort();
  if (!nights.length) return { nights: [], series: houses.map((house) => ({ house, values: [] })) };
  const days = daysBetween(data.meta.startDate, nights[nights.length - 1]);
  const series = houses.map((house) => {
    let run = 0;
    return { house, values: days.map((d) => (run += add[d]?.[house] || 0)) };
  });
  return { nights: days, series };
}
