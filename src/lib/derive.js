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
