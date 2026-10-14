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
  return { houseMap, eventMap, donByEvent, weasleyByEvent, bracketMap, matchesByEvent, matchesByNight, pointsByHouse };
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
