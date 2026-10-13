// Time helpers. All tournament times are IST wall-clock; matches after midnight
// belong to the previous "night" until the rollover hour (05:00 by default).

const DAY = 86400000;

export function offsetMinutes(offset = '+05:30') {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!m) return 330;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** Wall-clock parts of `date` in the tournament timezone. */
export function wallClock(date, offset) {
  const d = new Date(date.getTime() + offsetMinutes(offset) * 60000);
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

export function addDays(isoDay, n) {
  return new Date(Date.parse(isoDay + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
}

/** The tournament night that `date` belongs to (YYYY-MM-DD). */
export function nightOf(date, offset, rolloverHour = 5) {
  const { day, hour } = wallClock(date, offset);
  return hour < rolloverHour ? addDays(day, -1) : day;
}

export function daysBetween(start, end) {
  const out = [];
  if (!start || !end) return out;
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** '22:30' -> '10:30 PM' */
export function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function isAfterMidnight(hhmm, rolloverHour = 5) {
  if (!hhmm) return false;
  return Number(hhmm.split(':')[0]) < rolloverHour;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dayParts(isoDay) {
  const d = new Date(isoDay + 'T00:00:00Z');
  return { weekday: WEEKDAY[d.getUTCDay()], day: d.getUTCDate(), month: MONTH[d.getUTCMonth()] };
}
/** '2026-10-15' -> 'Thu 15 Oct' */
export function fmtDay(isoDay) {
  if (!isoDay) return '';
  const p = dayParts(isoDay);
  return `${p.weekday} ${p.day} ${p.month}`;
}

export function fmtAgo(iso, now = new Date()) {
  if (!iso) return '';
  const s = Math.max(0, Math.round((now - new Date(iso)) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

/** Optional ?now=2026-10-23T23:45 override (IST wall time) for previews and testing. */
export function nowOverride(search = typeof location !== 'undefined' ? location.search : '', offset = '+05:30') {
  const v = new URLSearchParams(search).get('now');
  if (!v || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const t = Date.parse(`${v}:00${offset}`);
  return isNaN(t) ? null : t - Date.now();
}
