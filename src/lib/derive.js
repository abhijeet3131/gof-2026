// Lookups and views derived from the /api/data payload.

export function textOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#14110a' : '#ffffff';
}

/** Display state of a match at time `now`. */
export function matchState(m, now) {
  if (m.type === 'Event') {
    if (!m.startsAt) return 'event';
    const start = Date.parse(m.startsAt);
    const end = m.endsAt ? Date.parse(m.endsAt) : start + 3 * 3600000;
    return now >= start && now < end ? 'event-now' : 'event';
  }
  if (m.status === 'Live') return 'live';
  if (m.status === 'Completed' || m.status === 'Walkover') return m.official ? 'done' : 'awaiting';
  if (m.status === 'Postponed') return 'postponed';
  if (m.status === 'Cancelled') return 'cancelled';
  if (m.startsAt && now >= Date.parse(m.startsAt)) return 'awaiting';
  return 'upcoming';
}

const before = (a, b) => (a.night === b.night ? a.sort < b.sort : a.night < b.night);

/**
 * The app always calls the earlier semi "Semi 1", whatever the sheet numbers it.
 * When an event's Semi 2 is scheduled first, the two semis swap labels and the
 * final's two slots swap too, so "Winner Semi-final 1" still points at the right match.
 * Display only: the sheet and its scoring keep their own numbering.
 */
export function orderSemis(data) {
  if (!data) return data;
  const semis = {};
  for (const m of data.matches) if (m.stage === 'Semi 1' || m.stage === 'Semi 2') (semis[m.event] ||= {})[m.stage] = m;
  const flipped = new Set(Object.keys(semis).filter((e) => {
    const s1 = semis[e]['Semi 1'], s2 = semis[e]['Semi 2'];
    return s1 && s2 && before(s2, s1);
  }));
  if (!flipped.size) return data;
  const matches = data.matches.map((m) => {
    if (!flipped.has(m.event)) return m;
    if (m.stage === 'Semi 1') return { ...m, stage: 'Semi 2' };
    if (m.stage === 'Semi 2') return { ...m, stage: 'Semi 1' };
    if (m.stage === 'Final') return { ...m, teamA: m.teamB, teamB: m.teamA };
    return m;
  });
  return { ...data, matches };
}

/**
 * Finalists score early (website-only rule, agreed with SCAM on 18 Oct):
 * a house that wins a knockout semi-final gets the event's 2nd-place points straight away,
 * and counts as a 2nd place in the tiebreak. The sheet adds the rest when the final is entered.
 * A house that put its DON on that sport still waits for the final (other finalists don't).
 * Standings are re-ranked here: total, then more 1sts, then more 2nds, then shared rank.
 */
export function withFinalists(data) {
  if (!data) return data;
  const donPicks = new Set(data.don.filter((d) => d.valid && d.event).map((d) => `${d.event}|${d.house}`));
  const decided = new Set(data.pointsLog.filter((p) => p.status === 'Decided').map((p) => p.event));
  const eventMap = Object.fromEntries(data.events.map((e) => [e.name, e]));
  const early = {};                                                     // "event|house" -> points
  for (const m of data.matches) {
    const e = eventMap[m.event];
    if (!e || e.format !== 'Knockout' || !m.stage.startsWith('Semi') || !m.official || !m.winner) continue;
    if (donPicks.has(`${m.event}|${m.winner}`) || decided.has(m.event)) continue;
    early[`${m.event}|${m.winner}`] = e.points2nd;
  }
  if (!Object.keys(early).length) return data;

  const extra = {};                                                     // house -> { points, finals }
  const pointsLog = data.pointsLog.map((p) => {
    const pts = early[`${p.event}|${p.house}`];
    if (pts === undefined || p.place) return p;
    const x = (extra[p.house] ||= { points: 0, finals: 0 });
    x.points += pts;
    x.finals += 1;
    return { ...p, place: '2nd', base: pts, total: pts, provisional: true };
  });
  const houseTotals = data.houseTotals.map((t) => {
    const x = extra[t.house];
    return x ? { ...t, eventPoints: t.eventPoints + x.points, total: t.total + x.points, seconds: t.seconds + x.finals } : t;
  });
  const byHouse = Object.fromEntries(houseTotals.map((t) => [t.house, t]));
  const better = (a, b) => b.total - a.total || b.firsts - a.firsts || b.seconds - a.seconds;
  const rows = data.standings.map((s) => {
    const t = byHouse[s.house];
    return t ? { ...s, total: t.total, firsts: t.firsts, seconds: t.seconds } : s;
  });
  rows.sort((a, b) => better(a, b) || a.house.localeCompare(b.house));
  const lead = rows[0]?.total ?? 0;
  const standings = rows.map((s, i) => ({
    ...s, position: i + 1, rank: 1 + rows.filter((o) => better(o, s) < 0).length, behind: lead - s.total,
  }));
  return { ...data, pointsLog, houseTotals, standings };
}

export function derive(data) {
  if (!data) return null;
  const houseMap = Object.fromEntries(data.houses.map((h) => [h.name, h]));
  const eventMap = Object.fromEntries(data.events.map((e) => [e.name, e]));
  const donByEvent = {};
  for (const d of data.don) if (d.event && d.valid) (donByEvent[d.event] ||= []).push(d.house);
  const weasleyByEvent = {};
  for (const w of data.weasley) (weasleyByEvent[w.event] ||= []).push(w);
  const bracketMap = Object.fromEntries(data.brackets.map((b) => [b.event, b]));
  const matchesByEvent = {};
  const matchesByNight = {};
  for (const m of data.matches) {
    if (m.event) (matchesByEvent[m.event] ||= []).push(m);
    (matchesByNight[m.night] ||= []).push(m);
  }
  const pointsByHouse = {};
  for (const p of data.pointsLog) {
    if (p.total !== 0 || p.place === '1st' || p.place === '2nd') (pointsByHouse[p.house] ||= []).push(p);
  }
  const { adjByEvent, adjTagged, adjTaggedSet } = tagAdjustments(data);
  const tiedSecond = {};
  for (const m of data.matches) {
    if (m.format !== 'Single round' || !m.official || m.second || !adjByEvent[m.event]) continue;
    const houses = Object.keys(adjByEvent[m.event]).filter((h) => adjByEvent[m.event][h].points > 0 && h !== m.winner);
    if (houses.length) tiedSecond[m.event] = houses.sort();
  }
  return { houseMap, eventMap, donByEvent, weasleyByEvent, bracketMap, matchesByEvent, matchesByNight, pointsByHouse, adjByEvent, adjTagged, adjTaggedSet, tiedSecond };
}

/**
 * SCAM adjustments whose reason starts with an event name ("BGMI: joint 2nd ...") belong to that event:
 * the app shows them in the event's row and on its result, e.g. points split for a tie.
 * adjByEvent[event][house] = { points, notes[] }; adjTagged[house] = total of tagged points;
 * adjTaggedSet = the tagged adjustment rows.
 */
export function tagAdjustments(data) {
  const names = data.events.map((e) => e.name).sort((a, b) => b.length - a.length);   // "Football Men" before "Football"
  const adjByEvent = {}, adjTagged = {}, adjTaggedSet = new Set();
  for (const a of data.adjustments) {
    const reason = (a.reason || '').trim();
    const event = names.find((n) => reason.toLowerCase().startsWith(n.toLowerCase()) && /^\s*[:\-–—]/.test(reason.slice(n.length)));
    if (!event || !a.house) continue;
    const slot = ((adjByEvent[event] ||= {})[a.house] ||= { points: 0, notes: [] });
    slot.points += a.points;
    slot.notes.push(reason.slice(event.length).replace(/^\s*[:\-–—]\s*/, ''));
    adjTagged[a.house] = (adjTagged[a.house] || 0) + a.points;
    adjTaggedSet.add(a);
  }
  return { adjByEvent, adjTagged, adjTaggedSet };
}

export function liveMatches(data, now) {
  return data.matches.filter((m) => matchState(m, now) === 'live');
}

export function recentResults(data, limit = Infinity) {
  return data.matches
    .filter((m) => m.official)
    .sort((a, b) => (a.night === b.night ? b.sort - a.sort : a.night < b.night ? 1 : -1))
    .slice(0, limit);
}

export const GENDER_ORDER = ['Men', 'Women', 'Mixed'];
