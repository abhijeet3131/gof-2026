// Builds the "full schedule" timetable (like SCAM's SCHEDULE tab) from the match list:
// one row per night, one column per 30-minute slot, parallel matches stacked in lanes.

const SLOT = 30;
const NOON = 12 * 60;

/** '23:30' -> minutes from the start of the night; times before the rollover hour count as after midnight. */
export function nightMinutes(hhmm, rolloverHour = 5) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m + (h < rolloverHour ? 1440 : 0);
}

const label = (mins) => {
  const t = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/**
 * @returns {{ cols: {start:number, time:string, nextDay:boolean, gap?:true}[], rows: {night:string, lanes:number, items:{m, c0:number, c1:number, lane:number}[]}[] }}
 * Column indexes c0/c1 are into `cols` (c1 exclusive). A match with no time spans the whole row.
 */
export function buildGrid(matches, days, rolloverHour = 5) {
  const timed = matches.filter((m) => m.start).map((m) => {
    const s = nightMinutes(m.start, rolloverHour);
    let e = m.end ? nightMinutes(m.end, rolloverHour) : s + SLOT;
    if (e <= s) e += 1440;
    return { m, s, e };
  });
  const morning = timed.filter((x) => x.s < NOON);
  const evening = timed.filter((x) => x.s >= NOON);

  // morning: just the slots morning matches start in (e.g. cricket at 06:00); evening: a continuous run
  const morningSlots = [...new Set(morning.map((x) => x.s - (x.s % SLOT)))].sort((a, b) => a - b);
  const cols = morningSlots.map((start) => ({ start, time: label(start), nextDay: false }));
  if (evening.length) {
    const first = Math.min(...evening.map((x) => x.s - (x.s % SLOT)));
    const last = Math.max(...evening.map((x) => x.e));
    if (cols.length) cols.push({ gap: true, start: first, time: '', nextDay: false });
    for (let t = first; t < last; t += SLOT) cols.push({ start: t, time: label(t), nextDay: t >= 1440 });
  }

  // first column whose slot covers minute t / first column starting at or after t
  const colAt = (t) => {
    let idx = 0;
    cols.forEach((c, i) => { if (!c.gap && c.start <= t) idx = i; });
    return idx;
  };
  const colFrom = (t) => {                              // the gap counts, so a morning match stops before it
    const i = cols.findIndex((c) => c.start >= t);
    return i === -1 ? cols.length : i;
  };

  const byNight = {};
  for (const m of matches) (byNight[m.night] ||= []).push(m);
  const rows = days.map((night) => {
    const items = (byNight[night] || []).map((m) => {
      const t = timed.find((x) => x.m === m);
      if (!t) return { m, c0: 0, c1: cols.length };
      const c0 = colAt(t.s);
      return { m, c0, c1: Math.max(c0 + 1, colFrom(t.e)) };
    }).sort((a, b) => a.c0 - b.c0 || b.c1 - a.c1);
    const laneEnds = [];
    for (const it of items) {
      let lane = laneEnds.findIndex((end) => end <= it.c0);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = it.c1;
      it.lane = lane;
    }
    return { night, lanes: Math.max(1, laneEnds.length), items };
  });
  return { cols, rows };
}
