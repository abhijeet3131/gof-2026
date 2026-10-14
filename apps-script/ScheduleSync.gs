/**
 * GOF 2026 - Schedule auto-sync (Google Apps Script)
 * ---------------------------------------------------
 * Makes the visual SCHEDULE tab the single place to plan the timetable.
 * Move a match cell in the grid (drag, cut/paste, merge to make it longer) and this
 * script writes the new Date / Start / End into the MATCHES tab, which the app reads.
 * Results (Status, Score, Winner) are never touched.
 *
 * Install (once, by the sheet owner):
 *   1. Extensions > Apps Script, delete what is there, paste this whole file, Save.
 *   2. Reload the sheet. A "GOF" menu appears. Click GOF > Turn on auto-sync and allow access.
 *   3. Click GOF > Sync schedule now to do the first sync.
 *
 * How grid cells are read:
 *   "FIFA (G v S)"          -> FIFA semi-final between those two houses
 *   "Volleyball W Finals"   -> Volleyball Women final
 *   "BGMI (All)", "Poker"   -> single-round events
 *   "Athletics (Relay) M"   -> Relay Men
 *   "Litfest", "Verve"      -> non-sport event card (no score)
 *   empty whole-row merge   -> unnamed event ("To be announced"); other empty merged cells are ignored
 *   A cell's start time is its column; a merged cell ends where the next column starts.
 *   A cell spanning the whole row has no times ("All evening").
 */

var GOF = {
  SCHEDULE_SHEET: 'SCHEDULE',
  MATCHES_SHEET: 'MATCHES',
  SETUP_SHEET: 'SETUP',
  LOG_SHEET: 'SYNC_LOG',
  MATCHES_FIRST_ROW: 4,
  MATCHES_LAST_ROW: 203,
  UNNAMED_EVENT_TITLE: 'To be announced',
  // Extra spellings SCAM may use in the grid -> exact event name in SETUP.
  // Most spellings already work automatically (M/W, TT, Shotput, Athletics (...)).
  ALIASES: {
    'vb m': 'Volleyball Men', 'vb w': 'Volleyball Women',
    'bb m': 'Basketball Men', 'bb w': 'Basketball Women',
    'fb m': 'Football Men', 'fb w': 'Football Women',
    'lt': 'Lawn Tennis', 'tennis': 'Lawn Tennis',
  },
};

/* ============================ pure logic (no Google APIs) ============================ */
/* These functions are also run by the project's automated tests in Node.               */

function gofNorm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/athletics/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/shot\s*put|shotput/g, 'shot put')
    .replace(/\btt\b/g, 'table tennis')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ (m|men|male|boys)$/, ' men')
    .replace(/ (w|women|female|girls)$/, ' women');
}

function gofParseTime(text) {
  var m = /^\s*(\d{1,2}):(\d{2})/.exec(String(text || ''));
  if (!m) return null;
  var h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

function gofFmtTime(mins) {
  if (mins === null || mins === undefined) return '';
  mins = ((mins % 1440) + 1440) % 1440;
  return (mins < 600 ? '0' : '') + Math.floor(mins / 60) + ':' + (mins % 60 < 10 ? '0' : '') + (mins % 60);
}

/** Finds the time header row, the time columns and the Date column in the grid's display values. */
function gofFindLayout(display) {
  var best = -1, bestCount = 0;
  for (var r = 0; r < Math.min(display.length, 15); r++) {
    var n = 0;
    for (var c = 0; c < display[r].length; c++) if (gofParseTime(display[r][c]) !== null) n++;
    if (n > bestCount) { bestCount = n; best = r; }
  }
  if (best < 0 || bestCount < 3) throw new Error('Could not find the row of times (like 21:30, 22:00 ...) in the SCHEDULE tab.');
  var dateCol = -1;
  for (var r2 = 0; r2 <= best && dateCol < 0; r2++) {
    for (var c2 = 0; c2 < display[r2].length; c2++) {
      if (/^\s*date\s*$/i.test(display[r2][c2])) { dateCol = c2; break; }
    }
  }
  if (dateCol < 0) throw new Error('Could not find the "Date" column header in the SCHEDULE tab.');
  var times = [];
  var first = -1, last = -1;
  for (var c3 = 0; c3 < display[best].length; c3++) {
    var t = c3 > dateCol ? gofParseTime(display[best][c3]) : null;
    times[c3] = t;
    if (t !== null) { if (first < 0) first = c3; last = c3; }
  }
  // Columns between the first and last time column with no time are spacers (e.g. the grey column).
  // Slot length = most common gap between neighbouring times (30 min in the GOF grid).
  var slot = 30;
  for (var c4 = first + 1; c4 <= last; c4++) {
    if (times[c4] !== null && times[c4 - 1] !== null) { slot = ((times[c4] - times[c4 - 1]) + 1440) % 1440 || 30; break; }
  }
  return { headerRow: best, dateCol: dateCol, times: times, firstCol: first, lastCol: last, slot: slot };
}

/**
 * Reads one grid label.
 * Returns {kind:'sport', event, pair:[codeA, codeB]|null, final:bool} | {kind:'event', title} | {kind:'error', message}.
 */
function gofParseLabel(label, events, houses, aliases) {
  var raw = String(label || '').replace(/\s+/g, ' ').trim();
  if (!raw) return { kind: 'event', title: GOF.UNNAMED_EVENT_TITLE };
  var codes = {};
  houses.forEach(function (h) { codes[String(h.code).toUpperCase()] = h.name; codes[String(h.name).toUpperCase()] = h.name; });
  var pair = null;
  var pm = /\(\s*([A-Za-z]+)\s*(?:v|vs|v\/s|x)\.?\s*([A-Za-z]+)\s*\)/i.exec(raw);
  if (pm) pair = [pm[1].toUpperCase(), pm[2].toUpperCase()];
  var all = /\(\s*all\s*\)/i.test(raw);
  var isFinal = /\bfinals?\b/i.test(raw);
  var base = raw.replace(pm ? pm[0] : '', ' ').replace(/\(\s*all\s*\)/i, ' ').replace(/\bfinals?\b/i, ' ');
  var key = gofNorm(base);
  var event = null;
  var byNorm = {};
  events.forEach(function (e) { byNorm[gofNorm(e.name)] = e; });
  if (byNorm[key]) event = byNorm[key];
  else {
    var al = aliases || {};
    for (var k in al) if (gofNorm(k) === key && byNorm[gofNorm(al[k])]) { event = byNorm[gofNorm(al[k])]; break; }
  }
  if (!event) {
    if (pair || all || isFinal) return { kind: 'error', message: 'Unknown sport in "' + raw + '"' };
    return { kind: 'event', title: raw };
  }
  if (pair) {
    var a = codes[pair[0]], b = codes[pair[1]];
    if (!a || !b) return { kind: 'error', message: 'Unknown house letter in "' + raw + '" (use G, S, R, H)' };
    if (a === b) return { kind: 'error', message: 'Same house twice in "' + raw + '"' };
    pair = [a, b];
  }
  if (event.format === 'Knockout' && !pair && !isFinal) {
    return { kind: 'error', message: '"' + raw + '": add the teams, e.g. "' + raw + ' (G v S)", or the word "Finals"' };
  }
  return { kind: 'sport', event: event.name, pair: event.format === 'Knockout' ? pair : null, final: event.format === 'Knockout' && isFinal };
}

/**
 * Turns the grid into a list of slots.
 * display: 2D array of display strings; isoDates: date (yyyy-mm-dd or '') per row;
 * merges: [{row, col, rows, cols}] 0-based, from getMergedRanges().
 */
function gofReadGrid(display, isoDates, merges, layout, events, houses, aliases) {
  var mergeAt = {}, covered = {};
  merges.forEach(function (m) {
    mergeAt[m.row + ':' + m.col] = m;
    for (var r = m.row; r < m.row + m.rows; r++) for (var c = m.col; c < m.col + m.cols; c++) {
      if (r !== m.row || c !== m.col) covered[r + ':' + c] = true;
    }
  });
  // A day can use several grid rows (parallel matches) with its Date cell merged down;
  // Sheets only gives the date to the top row, so pass it on to the rows below.
  isoDates = isoDates.slice();
  merges.forEach(function (m) {
    if (m.col <= layout.dateCol && m.col + m.cols > layout.dateCol && m.rows > 1 && isoDates[m.row]) {
      for (var rr = m.row + 1; rr < m.row + m.rows; rr++) if (!isoDates[rr]) isoDates[rr] = isoDates[m.row];
    }
  });
  var slots = [], problems = [];
  for (var r = layout.headerRow + 1; r < display.length; r++) {
    var date = isoDates[r];
    if (!date) continue;
    // Only the time columns (and spacer columns between them) hold matches; Date/Day columns are skipped.
    for (var c = layout.firstCol; c <= layout.lastCol; c++) {
      if (covered[r + ':' + c]) continue;
      var m = mergeAt[r + ':' + c];
      var text = String(display[r][c] || '').trim();
      var c1 = m ? Math.min(c + m.cols - 1, layout.lastCol) : c;
      var cell = gofColName(c) + (r + 1);
      var whole = c <= layout.firstCol && c1 >= layout.lastCol;
      // Empty cells are skipped. An empty merged cell is an (unnamed) event only when it spans the whole row;
      // smaller empty merges are leftovers from moving things around.
      if (!text && !whole) continue;
      var start = whole ? null : layout.times[c];
      // A cell starting in a spacer column (e.g. the grey one) starts at the first real time to its right.
      for (var cs = c; !whole && start === null && cs <= c1; cs++) start = layout.times[cs];
      var end = null;
      if (!whole) {
        if (c1 === layout.lastCol && layout.times[c1] !== null) end = layout.times[c1] + layout.slot;
        else if (layout.times[c1 + 1] !== null && layout.times[c1 + 1] !== undefined) end = layout.times[c1 + 1];
      }
      var parsed = gofParseLabel(text, events, houses, aliases);
      if (parsed.kind === 'error') { problems.push(cell + ': ' + parsed.message); continue; }
      slots.push({
        cell: cell, date: date, start: gofFmtTime(start), end: gofFmtTime(end),
        kind: parsed.kind, title: parsed.title || '', event: parsed.event || '',
        pair: parsed.pair || null, final: !!parsed.final,
      });
    }
  }
  return { slots: slots, problems: problems };
}

function gofColName(c) {
  var s = '';
  c += 1;
  while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); }
  return s;
}

/**
 * Works out what to change in MATCHES.
 * rows: [{row, id, date, start, end, type, event, title, stage, team1, team2, status}] (date yyyy-mm-dd, times HH:MM).
 * Returns {updates:[{row, date, start, end, label}], eventRowsToClear:[row], eventsToWrite:[{date,start,end,title}], problems:[], notes:[]}.
 */
function gofPlanSync(slots, rows, events) {
  var formatOf = {};
  events.forEach(function (e) { formatOf[e.name] = e.format; });
  var sportRows = rows.filter(function (x) { return x.type !== 'Event' && x.event; });
  var eventRows = rows.filter(function (x) { return x.type === 'Event'; });
  var problems = [], notes = [], updates = [];
  var assigned = {};   // row -> slot

  slots.filter(function (s) { return s.kind === 'sport'; }).forEach(function (s) {
    var match = null;
    var cands = sportRows.filter(function (x) { return x.event === s.event; });
    if (formatOf[s.event] !== 'Knockout') {
      match = cands[0] || null;
    } else if (s.final) {
      match = cands.filter(function (x) { return x.stage === 'Final'; })[0] || null;
    } else {
      match = cands.filter(function (x) {
        return /^Semi/.test(x.stage) && ((x.team1 === s.pair[0] && x.team2 === s.pair[1]) || (x.team1 === s.pair[1] && x.team2 === s.pair[0]));
      })[0] || null;
    }
    if (!match) { problems.push(s.cell + ': no ' + s.event + ' fixture for ' + (s.final ? 'the final' : s.pair ? s.pair.join(' v ') : 'this event') + ' in MATCHES'); return; }
    if (assigned[match.row]) { problems.push(s.cell + ': ' + match.event + ' ' + match.stage + ' appears twice in the grid (also ' + assigned[match.row].cell + '); using the first'); return; }
    assigned[match.row] = s;
    if (match.date !== s.date || match.start !== s.start || match.end !== s.end) {
      updates.push({ row: match.row, date: s.date, start: s.start, end: s.end, label: match.event + ' ' + match.stage });
    }
  });

  sportRows.forEach(function (x) {
    if (assigned[x.row]) return;
    var played = ['Completed', 'Walkover', 'Live'].indexOf(x.status) >= 0;
    if (played) { notes.push(x.event + ' ' + x.stage + ' is not in the grid but already has a result, so its date was kept'); return; }
    if (x.date || x.start || x.end) {
      updates.push({ row: x.row, date: '', start: '', end: '', label: x.event + ' ' + x.stage });
      notes.push(x.event + ' ' + x.stage + ' is not in the grid: now shown as "Not scheduled"');
    } else {
      notes.push(x.event + ' ' + x.stage + ' is still not in the grid (not scheduled)');
    }
  });

  var want = slots.filter(function (s) { return s.kind === 'event'; })
    .map(function (s) { return { date: s.date, start: s.start, end: s.end, title: s.title }; });
  var sig = function (e) { return [e.date, e.start, e.end, e.title].join('|'); };
  var have = eventRows.map(sig).sort().join('\n');
  var wanted = want.map(sig).sort().join('\n');
  var same = have === wanted;
  return {
    updates: updates, problems: problems, notes: notes,
    eventRowsToClear: same ? [] : eventRows.map(function (x) { return x.row; }),
    eventsToWrite: same ? [] : want,
  };
}

/* ======================= Google Sheets glue (runs inside Sheets) ======================= */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('GOF')
    .addItem('Sync schedule now', 'gofSyncNow')
    .addItem('Turn on auto-sync', 'gofInstallTrigger')
    .addToUi();
}

function gofInstallTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'gofOnChange') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('gofOnChange').forSpreadsheet(ss).onChange().create();
  ss.toast('Auto-sync is on. Changes to the SCHEDULE grid now update MATCHES automatically.', 'GOF', 8);
  gofSync(true);
}

function gofOnChange() { gofSync(false); }
function gofSyncNow() { gofSync(true); }

function gofSync(manual) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(25000)) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    var grid = ss.getSheetByName(GOF.SCHEDULE_SHEET);
    if (!grid) throw new Error('There is no tab called "' + GOF.SCHEDULE_SHEET + '".');
    var range = grid.getDataRange();
    var display = range.getDisplayValues();
    var merges = range.getMergedRanges().map(function (m) {
      return { row: m.getRow() - 1, col: m.getColumn() - 1, rows: m.getNumRows(), cols: m.getNumColumns() };
    });

    // Skip quickly when nothing in the grid changed since the last sync.
    var fingerprint = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,
      JSON.stringify([display, merges])));
    var props = PropertiesService.getDocumentProperties();
    if (!manual && props.getProperty('gofGridFingerprint') === fingerprint) return;

    var tz = ss.getSpreadsheetTimeZone();
    var layout = gofFindLayout(display);
    var year = gofTournamentYear(ss);
    var dateValues = grid.getRange(1, layout.dateCol + 1, display.length, 1).getValues();
    var isoDates = dateValues.map(function (v, i) {
      if (i <= layout.headerRow) return '';
      return gofToIso(v[0], display[i][layout.dateCol], tz, year);
    });

    var setup = gofReadSetup(ss);
    var read = gofReadGrid(display, isoDates, merges, layout, setup.events, setup.houses, GOF.ALIASES);
    var matches = ss.getSheetByName(GOF.MATCHES_SHEET);
    var rows = gofReadMatches(matches, tz);
    var plan = gofPlanSync(read.slots, rows, setup.events);
    gofApply(matches, plan, rows);

    props.setProperty('gofGridFingerprint', fingerprint);
    var problems = read.problems.concat(plan.problems);
    var moved = plan.updates.filter(function (u) { return u.date; }).length;
    var summary = moved + ' match' + (moved === 1 ? '' : 'es') + ' updated' +
      (plan.eventsToWrite.length || plan.eventRowsToClear.length ? ', events refreshed' : '') +
      (problems.length ? ', ' + problems.length + ' problem(s)' : '');
    gofLog(ss, summary, problems.concat(plan.notes), plan.updates);
    ss.toast(summary + (problems.length ? ' - see the SYNC_LOG tab.' : '.'), 'GOF schedule sync', problems.length ? 15 : 5);
  } catch (err) {
    gofLog(ss, 'Sync failed', [String(err && err.message || err)], []);
    ss.toast('Schedule sync failed: ' + (err && err.message || err), 'GOF', 20);
  } finally {
    lock.releaseLock();
  }
}

function gofTournamentYear(ss) {
  var setup = ss.getSheetByName(GOF.SETUP_SHEET);
  var vals = setup.getDataRange().getValues();
  for (var r = 0; r < vals.length; r++) for (var c = 0; c < vals[r].length - 1; c++) {
    if (vals[r][c] === 'Start date' && vals[r][c + 1] instanceof Date) return vals[r][c + 1].getFullYear();
  }
  return new Date().getFullYear();
}

function gofToIso(value, shown, tz, year) {
  if (value instanceof Date) return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  var s = String(shown || value || '').trim();
  var months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  var m = /^(\d{1,2})[\s\-\/]*([A-Za-z]{3})/.exec(s);
  if (m && months[m[2].toLowerCase()]) return year + '-' + gofPad(months[m[2].toLowerCase()]) + '-' + gofPad(Number(m[1]));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return m[3] + '-' + gofPad(Number(m[2])) + '-' + gofPad(Number(m[1]));
  return '';
}

function gofPad(n) { return (n < 10 ? '0' : '') + n; }

function gofReadSetup(ss) {
  var vals = ss.getSheetByName(GOF.SETUP_SHEET).getDataRange().getValues();
  var find = function (a, b) {
    for (var r = 0; r < vals.length; r++) for (var c = 0; c < vals[r].length - 1; c++) {
      if (vals[r][c] === a && vals[r][c + 1] === b) return { r: r, c: c };
    }
    throw new Error('SETUP table "' + a + '" not found');
  };
  var h = find('House', 'Code'), houses = [];
  for (var r = h.r + 1; r < vals.length && vals[r][h.c]; r++) houses.push({ name: String(vals[r][h.c]), code: String(vals[r][h.c + 1]) });
  var e = find('Event', 'Sport'), events = [];
  for (var r2 = e.r + 1; r2 < vals.length; r2++) {
    if (vals[r2][e.c]) events.push({ name: String(vals[r2][e.c]), format: String(vals[r2][e.c + 3]) });
  }
  return { houses: houses, events: events };
}

function gofReadMatches(sheet, tz) {
  var n = GOF.MATCHES_LAST_ROW - GOF.MATCHES_FIRST_ROW + 1;
  var range = sheet.getRange(GOF.MATCHES_FIRST_ROW, 1, n, 16);
  var vals = range.getValues(), shown = range.getDisplayValues();
  var rows = [];
  for (var i = 0; i < n; i++) {
    var v = vals[i];
    if (!v[0] && !v[4] && !v[5] && !v[6]) continue;
    rows.push({
      row: GOF.MATCHES_FIRST_ROW + i, id: String(v[0]),
      date: v[1] instanceof Date ? Utilities.formatDate(v[1], tz, 'yyyy-MM-dd') : '',
      start: gofFmtTime(gofParseTime(shown[i][2])), end: gofFmtTime(gofParseTime(shown[i][3])),
      type: String(v[4] || 'Sport'), event: String(v[5] || ''), title: String(v[6] || ''), stage: String(v[7] || ''),
      team1: String(v[8] || ''), team2: String(v[9] || ''), status: String(v[11] || ''),
    });
  }
  return rows;
}

function gofSerialDate(iso) {
  if (!iso) return '';
  var p = iso.split('-');
  return (Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])) - Date.UTC(1899, 11, 30)) / 86400000;
}

function gofSerialTime(hhmm) {
  var t = gofParseTime(hhmm);
  return t === null ? '' : t / 1440;
}

function gofApply(sheet, plan, rows) {
  plan.updates.forEach(function (u) {
    sheet.getRange(u.row, 2, 1, 3).setValues([[gofSerialDate(u.date), gofSerialTime(u.start), gofSerialTime(u.end)]]);
  });
  if (!plan.eventRowsToClear.length && !plan.eventsToWrite.length) return;
  var blank = function () { var a = []; for (var i = 0; i < 16; i++) a.push(''); return a; };
  plan.eventRowsToClear.forEach(function (row) { sheet.getRange(row, 1, 1, 16).setValues([blank()]); });
  // Free rows = cleared event rows + rows with no inputs, in sheet order.
  var used = {};
  rows.forEach(function (x) { if (x.type !== 'Event') used[x.row] = true; });
  var free = [];
  for (var r = GOF.MATCHES_FIRST_ROW; r <= GOF.MATCHES_LAST_ROW && free.length < plan.eventsToWrite.length; r++) {
    if (used[r]) continue;
    var isOldEvent = plan.eventRowsToClear.indexOf(r) >= 0;
    var isEmpty = !rows.some(function (x) { return x.row === r; });
    if (isOldEvent || isEmpty) free.push(r);
  }
  plan.eventsToWrite.forEach(function (e, i) {
    if (i >= free.length) throw new Error('MATCHES is full: no empty row left for event "' + e.title + '"');
    var v = blank();
    v[0] = 'E' + gofPad(i + 1); v[1] = gofSerialDate(e.date); v[2] = gofSerialTime(e.start); v[3] = gofSerialTime(e.end);
    v[4] = 'Event'; v[6] = e.title; v[11] = 'Scheduled';
    sheet.getRange(free[i], 1, 1, 16).setValues([v]);
  });
}

function gofLog(ss, summary, messages, updates) {
  var log = ss.getSheetByName(GOF.LOG_SHEET);
  if (!log) {
    log = ss.insertSheet(GOF.LOG_SHEET);
    log.getRange(1, 1, 1, 3).setValues([['When', 'Result', 'Details']]).setFontWeight('bold');
    log.setColumnWidth(1, 150); log.setColumnWidth(2, 260); log.setColumnWidth(3, 700);
  }
  var details = updates.map(function (u) { return u.label + ' -> ' + (u.date ? u.date + ' ' + (u.start || 'all evening') : 'not scheduled'); })
    .concat(messages).join('\n');
  log.insertRowAfter(1);
  log.getRange(2, 1, 1, 3).setValues([[new Date(), summary, details || '-']]).setWrap(true).setVerticalAlignment('top');
  if (log.getMaxRows() > 300) log.deleteRows(301, log.getMaxRows() - 300);
}
