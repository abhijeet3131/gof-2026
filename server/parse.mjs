// Turns raw sheet grids (2D arrays, as returned by the Google Sheets API with
// valueRenderOption=UNFORMATTED_VALUE) into the clean JSON the app uses.
// Tables are located by their header text, so inserting rows/columns above or
// beside a table in the sheet does not break the app.

const isEmpty = (v) => v === null || v === undefined || v === '';
const str = (v) => (isEmpty(v) ? '' : String(v).trim());
const num = (v) => (typeof v === 'number' ? v : isEmpty(v) || isNaN(Number(v)) ? null : Number(v));

// Finds the first cell where `texts` appear in consecutive cells of one row.
function findHeader(grid, texts) {
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (texts.every((t, i) => str(row[c + i]) === t)) return { r, c };
    }
  }
  return null;
}

/**
 * Read the table whose header row starts with `leading` (e.g. ['Event', 'Sport']).
 * untilBlank: stop at the first row whose first column is empty (for small stacked tables).
 */
export function readTable(grid, leading, { untilBlank = false } = {}) {
  const pos = findHeader(grid || [], [].concat(leading));
  if (!pos) return [];
  const headRow = grid[pos.r];
  const headers = [];
  for (let c = pos.c; c < headRow.length && !isEmpty(headRow[c]); c++) headers.push(str(headRow[c]));
  const rows = [];
  for (let r = pos.r + 1; r < grid.length; r++) {
    const row = grid[r] || [];
    if (untilBlank && isEmpty(row[pos.c])) break;
    const obj = {};
    let any = false;
    headers.forEach((h, i) => {
      const v = row[pos.c + i];
      obj[h] = isEmpty(v) ? '' : v;
      if (!isEmpty(v)) any = true;
    });
    if (any) rows.push(obj);
  }
  return rows;
}

// ---- dates & times ---------------------------------------------------------------
// Sheet serials are IST wall-clock values (days since 1899-12-30).
const EPOCH = Date.UTC(1899, 11, 30);
export function serialToDateString(v) {
  const n = num(v);
  if (n === null) return '';
  return new Date(EPOCH + Math.round(n) * 86400000).toISOString().slice(0, 10);
}
export function serialToTime(v) {
  const n = num(v);
  if (n === null) return '';
  const mins = Math.round((n - Math.floor(n)) * 1440) % 1440;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}
export function offsetString(hours) {
  const h = Number(hours) || 0;
  const sign = h < 0 ? '-' : '+';
  const abs = Math.abs(h);
  return `${sign}${String(Math.floor(abs)).padStart(2, '0')}:${String(Math.round((abs % 1) * 60)).padStart(2, '0')}`;
}
export function serialToIso(v, offset) {
  const n = num(v);
  if (n === null) return '';
  const ms = EPOCH + Math.round(n * 86400000 / 60000) * 60000;
  return new Date(ms).toISOString().slice(0, 16) + ':00' + offset;
}

// ---- payload ------------------------------------------------------------------------
export function buildPayload(sheets, meta = {}) {
  const settingsRows = readTable(sheets.SETUP, ['Setting', 'Value'], { untilBlank: true });
  const setting = (name) => settingsRows.find((r) => str(r.Setting).startsWith(name))?.Value;
  const offset = offsetString(setting('UTC offset') ?? 5.5);

  const houses = readTable(sheets.SETUP, ['House', 'Code'], { untilBlank: true })
    .filter((h) => str(h.House))
    .map((h) => ({ name: str(h.House), code: str(h.Code), colour: str(h.Colour) || '#888888' }));

  const events = readTable(sheets.SETUP, ['Event', 'Sport'])
    .filter((e) => str(e.Event))
    .map((e) => ({
      name: str(e.Event), sport: str(e.Sport), gender: str(e.Gender), format: str(e.Format),
      points1st: num(e['Points 1st']) ?? 0, points2nd: num(e['Points 2nd']) ?? 0,
      donEligible: str(e['DON eligible']) === 'Yes', venue: str(e['Default venue']),
    }));

  const matches = readTable(sheets.MATCHES, ['Match ID', 'Date'])
    .filter((m) => str(m.Name) && !isEmpty(m.Date))
    .map((m) => {
      const official = str(m.Official) === 'Yes';
      return {
        id: str(m['Match ID']),
        night: serialToDateString(m.Date),
        start: serialToTime(m.Start),
        end: serialToTime(m.End),
        startsAt: isEmpty(m.Start) ? '' : serialToIso(m['Starts at'], offset),
        endsAt: serialToIso(m['Ends at'], offset),
        type: str(m.Type) || 'Sport',
        name: str(m.Name),
        event: str(m.Event),
        stage: str(m.Stage),
        sport: str(m.Sport),
        gender: str(m.Gender),
        format: str(m.Format),
        venue: str(m.Venue),
        teamA: str(m['Team A']),
        teamB: str(m['Team B']),
        status: str(m.Status) || 'Scheduled',
        score: str(m.Score),
        notes: str(m.Notes),
        official,
        winner: official ? str(m['Result 1st']) : '',
        second: official ? str(m['Result 2nd']) : '',
        sort: num(m.Sort) ?? 0,
      };
    })
    .sort((a, b) => (a.night === b.night ? a.sort - b.sort : a.night < b.night ? -1 : 1));

  const don = readTable(sheets.DON, ['House', 'DON event'], { untilBlank: true })
    .filter((d) => str(d.House))
    .map((d) => ({
      house: str(d.House), event: str(d['DON event']), valid: str(d.Valid) === 'Yes',
      place: str(d.Place), result: str(d.Result), effect: num(d['DON effect']) ?? 0,
      eventPoints: num(d['Event points (with DON)']) ?? 0,
    }));

  const weasley = readTable(sheets.DON, ['Challenger', 'Challenged'])
    .filter((w) => str(w.Challenger))
    .map((w) => ({
      challenger: str(w.Challenger), challenged: str(w.Challenged), event: str(w.Event),
      result: str(w.Result) || 'Pending', points: num(w.Points) ?? 0,
    }));

  const houseTotals = readTable(sheets.LEADERBOARD, ['House', 'Event points'], { untilBlank: true })
    .filter((h) => str(h.House))
    .map((h) => ({
      house: str(h.House), eventPoints: num(h['Event points']) ?? 0, donEffect: num(h['DON effect']) ?? 0,
      weasley: num(h.Weasley) ?? 0, adjustments: num(h.Adjustments) ?? 0, total: num(h.Total) ?? 0,
      firsts: num(h['1st places']) ?? 0, seconds: num(h['2nd places']) ?? 0, rank: num(h.Rank) ?? 0,
    }));

  const standings = readTable(sheets.LEADERBOARD, ['Position', 'House'], { untilBlank: true })
    .filter((s) => str(s.House))
    .map((s) => ({
      position: num(s.Position), house: str(s.House), total: num(s.Total) ?? 0,
      firsts: num(s['1st places']) ?? 0, seconds: num(s['2nd places']) ?? 0,
      rank: num(s.Rank) ?? 0, behind: num(s['Behind leader']) ?? 0,
    }));

  const pointsLog = readTable(sheets.POINTS_LOG, ['Event', 'House'])
    .filter((p) => str(p.Event) && str(p.House))
    .map((p) => ({
      event: str(p.Event), house: str(p.House), place: str(p.Place),
      base: num(p['Base points']) ?? 0, donPick: str(p['DON pick']) === 'Yes',
      donEffect: num(p['DON effect']) ?? 0, total: num(p.Total) ?? 0, status: str(p['Event status']),
    }));

  const brackets = readTable(sheets.BRACKETS, ['Event', 'Format'])
    .filter((b) => str(b.Event))
    .map((b) => ({
      event: str(b.Event), format: str(b.Format), champion: str(b.Champion),
      runnerUp: str(b['Runner-up']), status: str(b.Status) || 'Upcoming',
    }));

  const adjustments = readTable(sheets.ADJUSTMENTS, ['Date', 'House'])
    .filter((a) => str(a.House) && num(a.Points) !== null)
    .map((a) => ({
      date: serialToDateString(a.Date), house: str(a.House), points: num(a.Points), reason: str(a.Reason),
    }));

  return {
    meta: {
      tournament: str(setting('Tournament name')) || 'Goblet of Fire 2026',
      startDate: serialToDateString(setting('Start date')),
      endDate: serialToDateString(setting('End date')),
      rolloverHour: num(setting('Day rollover hour')) ?? 5,
      utcOffset: offset,
      ...meta,
    },
    houses, events, matches, don, weasley, houseTotals, standings, pointsLog, brackets, adjustments,
  };
}
