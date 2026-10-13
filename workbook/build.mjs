// Builds GOF_2026_Workbook.xlsx — the central workbook SCAM uploads to Google Sheets.
// Only classic functions (SUMIFS/COUNTIFS/INDEX/MATCH/IFERROR...) are used so the
// formulas behave identically in Google Sheets, Excel and the HyperFormula test harness.
//
//   node workbook/build.mjs [outputPath]

import ExcelJS from 'exceljs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOUSES, EVENTS, WEASLEY, SCHEDULE } from './data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(here, '..', 'GOF_2026_Workbook.xlsx');

// ---- Layout constants (row numbers are 1-based) --------------------------------
const M_FIRST = 4, M_LAST = 203;          // MATCHES data rows
const E_FIRST = 12, E_LAST = 41;          // SETUP events table rows (30 slots)
const P_FIRST = 4, P_LAST = P_FIRST + (E_LAST - E_FIRST + 1) * 4 - 1; // POINTS_LOG rows (event x house)
const W_FIRST = 12, W_LAST = 15;          // DON sheet Weasley rows
const A_FIRST = 4, A_LAST = 103;          // ADJUSTMENTS rows
const T_FIRST = 6, T_LAST = 35;           // TODAY list rows
const B_FIRST = 4, B_LAST = B_FIRST + (E_LAST - E_FIRST); // BRACKETS rows

const rng = (sheet, col, a, b) => `${sheet}!$${col}$${a}:$${col}$${b}`;
const MR = (col) => rng('MATCHES', col, M_FIRST, M_LAST);
const ER = (col) => rng('SETUP', col, E_FIRST, E_LAST);
const PR = (col) => rng('POINTS_LOG', col, P_FIRST, P_LAST);
const HOUSE_LIST = 'SETUP!$A$5:$A$8';

// SETUP settings cells used by formulas
const SET = {
  rollover: 'SETUP!$M$9',
  donMult: 'SETUP!$M$11',
  donSecond: 'SETUP!$M$12',
  donPenalty: 'SETUP!$M$13',
  weasleyWin: 'SETUP!$M$14',
  weasleyLoss: 'SETUP!$M$15',
};

// ---- Styling helpers ------------------------------------------------------------
const C = {
  header: 'FF1F2937', headerText: 'FFFFFFFF',
  input: 'FFFFF7D6', calc: 'FFEFEFEF', title: 'FF7A5C12', note: 'FF555555',
};
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = { style: 'thin', color: { argb: 'FFD0D0D0' } };
const border = { top: thin, left: thin, bottom: thin, right: thin };

function title(ws, text, note) {
  ws.getCell('A1').value = text;
  ws.getCell('A1').font = { bold: true, size: 15, color: { argb: C.title } };
  if (note) {
    ws.getCell('A2').value = note;
    ws.getCell('A2').font = { italic: true, size: 10, color: { argb: C.note } };
  }
}

function header(ws, row, col, names) {
  names.forEach((n, i) => {
    const cell = ws.getCell(row, col + i);
    cell.value = n;
    cell.font = { bold: true, color: { argb: C.headerText } };
    cell.fill = fill(C.header);
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = border;
  });
  ws.getRow(row).height = 30;
}

function paint(ws, r1, r2, c1, c2, kind) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = ws.getCell(r, c);
      cell.fill = fill(kind === 'input' ? C.input : C.calc);
      cell.border = border;
    }
  }
}

const f = (formula) => ({ formula });
const colNum = (letters) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);

function listValidation(ws, address, source) {
  ws.dataValidations.add(address, {
    type: 'list', allowBlank: true, formulae: [source],
    showErrorMessage: true, errorStyle: 'stop',
    errorTitle: 'Invalid value', error: 'Pick a value from the dropdown list.',
  });
}

function widths(ws, list) {
  list.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}

// Excel serials (days since 1899-12-30) for dates and fractions of a day for times.
const dateSerial = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
};
const timeSerial = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60 + m) / 1440;
};

const houseByCode = Object.fromEntries(HOUSES.map((h) => [h.code, h.name]));

// ---- Workbook ---------------------------------------------------------------------
const wb = new ExcelJS.Workbook();
wb.creator = 'SCAM - Goblet of Fire 2026';
wb.created = new Date();
wb.calcProperties = { fullCalcOnLoad: true };

const tabs = {};
for (const [name, colour] of [
  ['SETUP', 'FF6B7280'], ['MATCHES', 'FFD97706'], ['DON', 'FFD97706'], ['ADJUSTMENTS', 'FFD97706'],
  ['POINTS_LOG', 'FF6B7280'], ['LEADERBOARD', 'FF059669'], ['TODAY', 'FF2563EB'],
  ['BRACKETS', 'FF2563EB'], ['DASHBOARD', 'FF059669'],
]) {
  tabs[name] = wb.addWorksheet(name, { properties: { tabColor: { argb: colour } } });
}

// ================================ SETUP ===========================================
{
  const ws = tabs.SETUP;
  title(ws, 'SETUP - houses, events, scoring rules and settings',
    'Yellow cells are inputs. Change these only if the rulebook changes. Grey cells are formulas - do not edit.');

  header(ws, 4, 1, ['House', 'Code', 'Colour']);
  HOUSES.forEach((h, i) => {
    ws.getRow(5 + i).getCell(1).value = h.name;
    ws.getRow(5 + i).getCell(2).value = h.code;
    ws.getRow(5 + i).getCell(3).value = h.colour;
  });
  paint(ws, 5, 8, 1, 3, 'input');

  header(ws, 4, 12, ['Setting', 'Value']);
  const settings = [
    ['Tournament name', 'Goblet of Fire 2026'],
    ['Start date', dateSerial('2026-10-14')],
    ['End date', dateSerial('2026-11-04')],
    ['DON deadline', '14 Oct 2026'],
    ['Day rollover hour (times before this belong to the previous night)', 5],
    ['UTC offset (hours)', 5.5],
    ['DON multiplier for 1st place', 2],
    ['DON points for 2nd place', 0],
    ['DON penalty (3rd/4th, out, no-show)', -100],
    ['Weasley Challenge win (challenger only)', 50],
    ['Weasley Challenge loss (challenger only)', -50],
  ];
  settings.forEach(([k, v], i) => {
    ws.getCell(5 + i, 12).value = k;
    ws.getCell(5 + i, 13).value = v;
  });
  ws.getCell('M6').numFmt = 'dd-mmm-yyyy';
  ws.getCell('M7').numFmt = 'dd-mmm-yyyy';
  paint(ws, 5, 4 + settings.length, 12, 12, 'calc');
  paint(ws, 5, 4 + settings.length, 13, 13, 'input');

  const lists = [
    ['O', 'Status', ['Scheduled', 'Live', 'Completed', 'Walkover', 'Postponed', 'Cancelled']],
    ['Q', 'Stage', ['Semi 1', 'Semi 2', 'Final', 'Single round']],
    ['S', 'Type', ['Sport', 'Event']],
    ['U', 'Format', ['Knockout', 'Single round']],
    ['W', 'Yes/No', ['Yes', 'No']],
    ['Y', 'Gender', ['Men', 'Women', 'Mixed']],
  ];
  for (const [col, name, values] of lists) {
    const c = colNum(col);
    header(ws, 4, c, [name]);
    values.forEach((v, i) => { ws.getCell(5 + i, c).value = v; });
    paint(ws, 5, 4 + values.length, c, c, 'calc');
  }

  ws.getCell('A10').value = 'EVENTS - one row per event. Men and Women are separate events with full points each.';
  ws.getCell('A10').font = { bold: true };
  header(ws, 11, 1, ['Event', 'Sport', 'Gender', 'Format', 'Points 1st', 'Points 2nd', 'DON eligible', 'Default venue', 'DON #', 'DON options']);
  EVENTS.forEach((e, i) => {
    e.forEach((v, j) => { ws.getCell(E_FIRST + i, 1 + j).value = v; });
  });
  for (let r = E_FIRST; r <= E_LAST; r++) {
    ws.getCell(r, 9).value = f(`IF(AND(A${r}<>"",G${r}="Yes"),COUNTIF($G$${E_FIRST}:G${r},"Yes"),"")`);
    ws.getCell(r, 10).value = f(`IFERROR(INDEX($A$${E_FIRST}:$A$${E_LAST},MATCH(ROW()-${E_FIRST - 1},$I$${E_FIRST}:$I$${E_LAST},0)),"")`);
  }
  paint(ws, E_FIRST, E_LAST, 1, 8, 'input');
  paint(ws, E_FIRST, E_LAST, 9, 10, 'calc');
  listValidation(ws, `C${E_FIRST}:C${E_LAST}`, 'SETUP!$Y$5:$Y$7');
  listValidation(ws, `D${E_FIRST}:D${E_LAST}`, 'SETUP!$U$5:$U$6');
  listValidation(ws, `G${E_FIRST}:G${E_LAST}`, 'SETUP!$W$5:$W$6');

  widths(ws, [18, 13, 10, 14, 11, 11, 12, 20, 8, 18, 3, 46, 20, 3, 12, 3, 12, 3, 8, 3, 13, 3, 8, 3, 9]);
}

// ================================ MATCHES =========================================
{
  const ws = tabs.MATCHES;
  title(ws, 'MATCHES - master schedule and results (main input sheet)',
    'Yellow = type here. Grey = automatic. Final rows: leave Team 1/Team 2 blank - they fill in from the semi-final winners. Points count only when Status is Completed or Walkover.');

  const inputs = ['Match ID', 'Date', 'Start', 'End', 'Type', 'Event', 'Title', 'Stage', 'Team 1', 'Team 2',
    'Venue override', 'Status', 'Score', 'Winner / 1st', '2nd place', 'Notes'];
  const calcs = ['Name', 'Sport', 'Gender', 'Format', 'Venue', 'Team A', 'Team B', 'Official', 'Result 1st',
    'Result 2nd', 'Key', 'Pair key', 'Starts at', 'Ends at', 'Sort', 'Today #', 'Check', 'Live #',
    'Upcoming at', 'Result at'];
  header(ws, 3, 1, [...inputs, ...calcs]);
  // A..P inputs, Q..AJ calcs
  for (let i = 0; i < SCHEDULE.length; i++) {
    const [date, start, end, type, ev, stage, t1, t2] = SCHEDULE[i];
    const r = M_FIRST + i;
    const row = ws.getRow(r);
    row.getCell(1).value = `M${String(i + 1).padStart(2, '0')}`;
    row.getCell(2).value = dateSerial(date);
    if (start) row.getCell(3).value = timeSerial(start);
    if (end) row.getCell(4).value = timeSerial(end);
    row.getCell(5).value = type;
    if (type === 'Sport') row.getCell(6).value = ev; else row.getCell(7).value = ev;
    if (stage) row.getCell(8).value = stage;
    if (t1) row.getCell(9).value = houseByCode[t1];
    if (t2) row.getCell(10).value = houseByCode[t2];
    row.getCell(12).value = 'Scheduled';
  }

  for (let r = M_FIRST; r <= M_LAST; r++) {
    const row = ws.getRow(r);
    const set = (col, formula) => { row.getCell(colNum(col)).value = f(formula); };
    const lookup = (col) => `IFERROR(INDEX(${ER(col)},MATCH(F${r},${ER('A')},0)),"")`;
    const done = `OR(L${r}="Completed",L${r}="Walkover")`;
    set('Q', `IF(E${r}="Event",G${r}&"",IF(F${r}="","",F${r}&IF(OR(H${r}="",H${r}="Single round"),""," - "&H${r})))`);
    set('R', `IF(F${r}="","",${lookup('B')})`);
    set('S', `IF(F${r}="","",${lookup('C')})`);
    set('T', `IF(F${r}="","",${lookup('D')})`);
    set('U', `IF(K${r}<>"",K${r}&"",IF(F${r}="","",${lookup('H')}))`);
    set('V', `IF(H${r}="Final",IFERROR(INDEX(${MR('Y')},MATCH(F${r}&"|Semi 1",${MR('AA')},0))&"",""),I${r}&"")`);
    set('W', `IF(H${r}="Final",IFERROR(INDEX(${MR('Y')},MATCH(F${r}&"|Semi 2",${MR('AA')},0))&"",""),J${r}&"")`);
    set('X', `IF(AND(${done},N${r}<>"",F${r}<>""),"Yes","No")`);
    set('Y', `IF(X${r}="Yes",N${r}&"","")`);
    set('Z', `IF(X${r}<>"Yes","",IF(T${r}="Single round",O${r}&"",IF(N${r}=V${r},W${r},IF(N${r}=W${r},V${r},""))))`);
    set('AA', `IF(F${r}="","",F${r}&"|"&H${r})`);
    set('AB', `IF(AND(LEFT(H${r},4)="Semi",V${r}<>"",W${r}<>""),F${r}&"|"&IF(V${r}<W${r},V${r}&"/"&W${r},W${r}&"/"&V${r}),"")`);
    set('AC', `IF(B${r}="","",B${r}+IF(C${r}="",0,C${r}+IF(IFERROR(HOUR(C${r}),12)<${SET.rollover},1,0)))`);
    set('AD', `IF(OR(B${r}="",D${r}=""),"",B${r}+D${r}+IF(IFERROR(HOUR(D${r}),12)<${SET.rollover},1,0))`);
    set('AE', `IF(B${r}="","",IF(C${r}="",0,ROUND((AC${r}-B${r})*1440,0))*1000+ROW())`);
    set('AF', `IF(OR(B${r}="",B${r}<>TODAY!$C$3),"",COUNTIFS(${MR('B')},TODAY!$C$3,${MR('AE')},"<"&AE${r})+1)`);
    const checks = [
      [`AND(E${r}="",OR(F${r}<>"",G${r}<>""))`, 'Pick a Type. '],
      [`AND(E${r}="Sport",F${r}="")`, 'Pick an Event. '],
      [`AND(E${r}="Sport",F${r}<>"",T${r}="")`, 'Event not found in SETUP. '],
      [`AND(E${r}="Sport",H${r}="")`, 'Pick a Stage. '],
      [`AND(T${r}="Single round",H${r}<>"",H${r}<>"Single round")`, 'Stage must be Single round for this event. '],
      [`AND(T${r}="Knockout",H${r}="Single round")`, 'Knockout event needs Semi 1 / Semi 2 / Final. '],
      [`AND(LEFT(H${r},4)="Semi",OR(I${r}="",J${r}=""))`, 'Enter Team 1 and Team 2. '],
      [`AND(I${r}<>"",I${r}=J${r})`, 'Team 1 and Team 2 are the same. '],
      [`AND(E${r}="Sport",${done},N${r}="")`, 'Enter the Winner. '],
      [`AND(T${r}="Knockout",N${r}<>"",N${r}<>V${r},N${r}<>W${r})`, 'Winner is not playing in this match. '],
      [`AND(T${r}="Single round",${done},O${r}="")`, 'Enter 2nd place. '],
      [`AND(O${r}<>"",O${r}=N${r})`, '1st and 2nd are the same house. '],
      [`AND(O${r}<>"",T${r}="Knockout")`, '2nd place is only for single-round events (knockout loser is automatic). '],
      [`AND(N${r}<>"",NOT(${done}))`, 'Winner entered but Status is not Completed/Walkover - not counted yet. '],
      [`AND(AA${r}<>"",COUNTIF(${MR('AA')},AA${r})>1)`, 'Duplicate: this event + stage appears twice. '],
    ];
    set('AG', `TRIM(${checks.map(([cond, msg]) => `IF(${cond},"${msg}","")`).join('&')})`);
    set('AH', `IF(L${r}="Live",COUNTIF($L$${M_FIRST}:L${r},"Live"),"")`);
    set('AI', `IF(AND(OR(L${r}="Scheduled",L${r}=""),E${r}="Sport",AC${r}<>""),IF(AC${r}>=NOW(),AC${r},""),"")`);
    set('AJ', `IF(X${r}="Yes",AC${r},"")`);

    row.getCell(2).numFmt = 'ddd dd-mmm';
    row.getCell(3).numFmt = 'hh:mm';
    row.getCell(4).numFmt = 'hh:mm';
    row.getCell(colNum('AC')).numFmt = 'dd-mmm hh:mm';
    row.getCell(colNum('AD')).numFmt = 'dd-mmm hh:mm';
    row.getCell(colNum('AI')).numFmt = 'dd-mmm hh:mm';
    row.getCell(colNum('AJ')).numFmt = 'dd-mmm hh:mm';
  }
  paint(ws, M_FIRST, M_LAST, 1, 16, 'input');
  paint(ws, M_FIRST, M_LAST, 17, colNum('AJ'), 'calc');

  const all = (col) => `${col}${M_FIRST}:${col}${M_LAST}`;
  listValidation(ws, all('E'), 'SETUP!$S$5:$S$6');
  listValidation(ws, all('F'), ER('A'));
  listValidation(ws, all('H'), 'SETUP!$Q$5:$Q$8');
  for (const col of ['I', 'J', 'N', 'O']) listValidation(ws, all(col), HOUSE_LIST);
  listValidation(ws, all('L'), 'SETUP!$O$5:$O$10');

  ws.addConditionalFormatting({
    ref: all('AG'),
    rules: [{ type: 'expression', formulae: [`LEN(AG${M_FIRST})>0`], style: { fill: fill('FFFCA5A5'), font: { color: { argb: 'FF7F1D1D' } } } }],
  });
  ws.addConditionalFormatting({
    ref: all('L'),
    rules: [
      { type: 'cellIs', operator: 'equal', formulae: ['"Live"'], style: { fill: fill('FFFCA5A5'), font: { bold: true } } },
      { type: 'cellIs', operator: 'equal', formulae: ['"Completed"'], style: { fill: fill('FFBBF7D0') } },
      { type: 'cellIs', operator: 'equal', formulae: ['"Walkover"'], style: { fill: fill('FFBBF7D0') } },
    ],
  });

  widths(ws, [8, 13, 7, 7, 8, 17, 16, 12, 12, 12, 14, 12, 18, 13, 13, 22,
    28, 12, 8, 13, 18, 12, 12, 8, 12, 12, 24, 30, 14, 14, 8, 8, 40, 7, 14, 14]);
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 3 }];
}

// ================================ DON =============================================
{
  const ws = tabs.DON;
  title(ws, 'DON - Double or Nothing declarations + Weasley Challenge',
    'Pick ONE event per house (sport + gender). 1st = points x2, 2nd = 0, 3rd/4th/out = -100. Not allowed on E-Sports or Athletics, or on the house\'s Weasley Challenge sport.');
  header(ws, 3, 1, ['House', 'DON event', 'Declared on', 'Eligible', 'Weasley conflict', 'Valid', 'Place',
    'Result', 'DON effect', 'Event points (with DON)']);
  for (let i = 0; i < 4; i++) {
    const r = 4 + i;
    const set = (col, formula) => { ws.getCell(`${col}${r}`).value = f(formula); };
    set('A', `SETUP!A${5 + i}`);
    set('D', `IF(B${r}="","",IF(IFERROR(INDEX(${ER('G')},MATCH(B${r},${ER('A')},0)),"No")="Yes","Yes","No"))`);
    set('E', `IF(B${r}="","",IF(COUNTIFS($A$${W_FIRST}:$A$${W_LAST},A${r},$C$${W_FIRST}:$C$${W_LAST},B${r})>0,"Yes","No"))`);
    set('F', `IF(B${r}="","",IF(AND(D${r}="Yes",E${r}="No"),"Yes","No"))`);
    set('G', `IF(F${r}<>"Yes","",IFERROR(INDEX(${PR('I')},MATCH(B${r}&"|"&A${r},${PR('N')},0))&"",""))`);
    set('H', `IF(B${r}="","Not declared yet",IF(F${r}<>"Yes",IF(D${r}<>"Yes","INVALID - DON not allowed for this event","INVALID - same sport as Weasley Challenge"),IF(G${r}="1st","Won - points doubled",IF(G${r}="2nd","Runner-up - 0 points",IF(G${r}="Out","Out - penalty applied","Pending")))))`);
    set('I', `IF(F${r}<>"Yes",0,IFERROR(INDEX(${PR('L')},MATCH(B${r}&"|"&A${r},${PR('N')},0)),0))`);
    set('J', `IF(F${r}<>"Yes",0,IFERROR(INDEX(${PR('M')},MATCH(B${r}&"|"&A${r},${PR('N')},0)),0))`);
    ws.getCell(`C${r}`).numFmt = 'dd-mmm hh:mm';
  }
  paint(ws, 4, 7, 1, 1, 'calc');
  paint(ws, 4, 7, 2, 3, 'input');
  paint(ws, 4, 7, 4, 10, 'calc');
  listValidation(ws, 'B4:B7', `SETUP!$J$${E_FIRST}:$J$${E_LAST}`);
  ws.addConditionalFormatting({
    ref: 'H4:H7',
    rules: [{ type: 'containsText', operator: 'containsText', text: 'INVALID', style: { fill: fill('FFFCA5A5') } }],
  });

  ws.getCell('A10').value = 'WEASLEY CHALLENGE - challenger gets +50 for winning the locked semi-final, -50 for losing. The challenged house is unaffected.';
  ws.getCell('A10').font = { bold: true };
  header(ws, 11, 1, ['Challenger', 'Challenged', 'Event', 'Match found', 'Winner', 'Result', 'Points']);
  WEASLEY.forEach((w, i) => {
    const r = W_FIRST + i;
    ws.getCell(`A${r}`).value = w.challenger;
    ws.getCell(`B${r}`).value = w.challenged;
    ws.getCell(`C${r}`).value = w.event;
  });
  for (let r = W_FIRST; r <= W_LAST; r++) {
    const pair = `C${r}&"|"&IF(A${r}<B${r},A${r}&"/"&B${r},B${r}&"/"&A${r})`;
    ws.getCell(`D${r}`).value = f(`IF(OR(A${r}="",B${r}="",C${r}=""),"",IF(ISNUMBER(MATCH(${pair},${MR('AB')},0)),"Yes","No - check MATCHES"))`);
    ws.getCell(`E${r}`).value = f(`IF(D${r}<>"Yes","",IFERROR(INDEX(${MR('Y')},MATCH(${pair},${MR('AB')},0))&"",""))`);
    ws.getCell(`F${r}`).value = f(`IF(A${r}="","",IF(E${r}="","Pending",IF(E${r}=A${r},"Won","Lost")))`);
    ws.getCell(`G${r}`).value = f(`IF(F${r}="Won",${SET.weasleyWin},IF(F${r}="Lost",${SET.weasleyLoss},0))`);
  }
  paint(ws, W_FIRST, W_LAST, 1, 3, 'input');
  paint(ws, W_FIRST, W_LAST, 4, 7, 'calc');
  listValidation(ws, `A${W_FIRST}:B${W_LAST}`, HOUSE_LIST);
  listValidation(ws, `C${W_FIRST}:C${W_LAST}`, ER('A'));
  widths(ws, [14, 20, 15, 10, 16, 8, 8, 36, 11, 14]);
  ws.views = [{ state: 'frozen', ySplit: 3 }];
}

// ================================ ADJUSTMENTS =====================================
{
  const ws = tabs.ADJUSTMENTS;
  title(ws, 'ADJUSTMENTS - manual bonus/penalty points decided by SCAM',
    'Use negative numbers for penalties. Every row must have a reason. These feed straight into the leaderboard.');
  header(ws, 3, 1, ['Date', 'House', 'Points', 'Reason', 'Approved by']);
  paint(ws, A_FIRST, A_LAST, 1, 5, 'input');
  for (let r = A_FIRST; r <= A_LAST; r++) ws.getCell(`A${r}`).numFmt = 'dd-mmm-yyyy';
  listValidation(ws, `B${A_FIRST}:B${A_LAST}`, HOUSE_LIST);
  ws.dataValidations.add(`C${A_FIRST}:C${A_LAST}`, {
    type: 'decimal', operator: 'between', allowBlank: true, formulae: [-10000, 10000],
    showErrorMessage: true, error: 'Enter a number (negative for penalties).',
  });
  widths(ws, [13, 14, 9, 50, 18]);
  ws.views = [{ state: 'frozen', ySplit: 3 }];
}

// ================================ POINTS_LOG ======================================
{
  const ws = tabs.POINTS_LOG;
  title(ws, 'POINTS_LOG - automatic: points per event per house (do not edit)',
    'One row per event x house. Place: 1st / 2nd / Out (lost a semi, or event decided without them) / blank (still in contention).');
  header(ws, 3, 1, ['Event', 'House', 'Format', 'Points 1st', 'Points 2nd', 'Event 1st', 'Event 2nd', 'Lost semi',
    'Place', 'Base points', 'DON pick', 'DON effect', 'Total', 'Key', 'Event status']);
  for (let r = P_FIRST; r <= P_LAST; r++) {
    const set = (col, formula) => { ws.getCell(`${col}${r}`).value = f(formula); };
    const idx = `INT((ROW()-${P_FIRST})/4)+1`;
    const finalKey = `A${r}&"|"&IF(C${r}="Knockout","Final","Single round")`;
    set('A', `IFERROR(IF(INDEX(${ER('A')},${idx})="","",INDEX(${ER('A')},${idx})&""),"")`);
    set('B', `IF(A${r}="","",INDEX(${HOUSE_LIST},MOD(ROW()-${P_FIRST},4)+1))`);
    set('C', `IF(A${r}="","",INDEX(${ER('D')},${idx}))`);
    set('D', `IF(A${r}="","",INDEX(${ER('E')},${idx}))`);
    set('E', `IF(A${r}="","",INDEX(${ER('F')},${idx}))`);
    set('F', `IF(A${r}="","",IFERROR(INDEX(${MR('Y')},MATCH(${finalKey},${MR('AA')},0))&"",""))`);
    set('G', `IF(A${r}="","",IFERROR(INDEX(${MR('Z')},MATCH(${finalKey},${MR('AA')},0))&"",""))`);
    set('H', `IF(A${r}="","",IF(COUNTIFS(${MR('F')},A${r},${MR('H')},"Semi*",${MR('Z')},B${r})>0,"Yes","No"))`);
    set('I', `IF(A${r}="","",IF(F${r}=B${r},"1st",IF(G${r}=B${r},"2nd",IF(OR(H${r}="Yes",AND(F${r}<>"",G${r}<>"")),"Out",""))))`);
    set('J', `IF(A${r}="","",IF(I${r}="1st",D${r},IF(I${r}="2nd",E${r},0)))`);
    set('K', `IF(A${r}="","",IF(COUNTIFS(DON!$A$4:$A$7,B${r},DON!$B$4:$B$7,A${r},DON!$F$4:$F$7,"Yes")>0,"Yes","No"))`);
    set('L', `IF(A${r}="","",IF(K${r}<>"Yes",0,IF(I${r}="1st",D${r}*(${SET.donMult}-1),IF(I${r}="2nd",${SET.donSecond}-E${r},IF(I${r}="Out",${SET.donPenalty},0)))))`);
    set('M', `IF(A${r}="","",J${r}+L${r})`);
    set('N', `IF(A${r}="","",A${r}&"|"&B${r})`);
    set('O', `IF(A${r}="","",IF(F${r}<>"","Decided",IF(COUNTIFS(${MR('F')},A${r},${MR('X')},"Yes")+COUNTIFS(${MR('F')},A${r},${MR('L')},"Live")>0,"In progress","Upcoming")))`);
  }
  paint(ws, P_FIRST, P_LAST, 1, 15, 'calc');
  widths(ws, [17, 12, 13, 9, 9, 12, 12, 9, 7, 10, 9, 10, 8, 28, 12]);
  ws.views = [{ state: 'frozen', ySplit: 3 }];
}

// ================================ LEADERBOARD =====================================
{
  const ws = tabs.LEADERBOARD;
  title(ws, 'LEADERBOARD - automatic house rankings (do not edit)',
    'Ties: more 1st places, then more 2nd places, then shared rank.');
  header(ws, 3, 1, ['House', 'Event points', 'DON effect', 'Weasley', 'Adjustments', 'Total', '1st places',
    '2nd places', 'Rank', 'Rank key', 'Order key']);
  for (let i = 0; i < 4; i++) {
    const r = 4 + i;
    const set = (col, formula) => { ws.getCell(`${col}${r}`).value = f(formula); };
    set('A', `SETUP!A${5 + i}`);
    set('B', `SUMIFS(${PR('J')},${PR('B')},A${r})`);
    set('C', `SUMIFS(${PR('L')},${PR('B')},A${r})`);
    set('D', `SUMIFS(DON!$G$${W_FIRST}:$G$${W_LAST},DON!$A$${W_FIRST}:$A$${W_LAST},A${r})`);
    set('E', `SUMIFS(ADJUSTMENTS!$C$${A_FIRST}:$C$${A_LAST},ADJUSTMENTS!$B$${A_FIRST}:$B$${A_LAST},A${r})`);
    set('F', `B${r}+C${r}+D${r}+E${r}`);
    set('G', `COUNTIFS(${PR('B')},A${r},${PR('I')},"1st")`);
    set('H', `COUNTIFS(${PR('B')},A${r},${PR('I')},"2nd")`);
    set('J', `F${r}*10000+G${r}*100+H${r}`);
    set('I', `1+COUNTIF($J$4:$J$7,">"&J${r})`);
    set('K', `J${r}*10+(5-(ROW()-3))`);
  }
  paint(ws, 4, 7, 1, 11, 'calc');

  ws.getCell('A9').value = 'STANDINGS';
  ws.getCell('A9').font = { bold: true };
  header(ws, 10, 1, ['Position', 'House', 'Total', '1st places', '2nd places', 'Rank', 'Behind leader']);
  for (let k = 1; k <= 4; k++) {
    const r = 10 + k;
    const set = (col, formula) => { ws.getCell(`${col}${r}`).value = f(formula); };
    ws.getCell(`A${r}`).value = k;
    set('B', `INDEX($A$4:$A$7,MATCH(LARGE($K$4:$K$7,A${r}),$K$4:$K$7,0))`);
    set('C', `INDEX($F$4:$F$7,MATCH(B${r},$A$4:$A$7,0))`);
    set('D', `INDEX($G$4:$G$7,MATCH(B${r},$A$4:$A$7,0))`);
    set('E', `INDEX($H$4:$H$7,MATCH(B${r},$A$4:$A$7,0))`);
    set('F', `INDEX($I$4:$I$7,MATCH(B${r},$A$4:$A$7,0))`);
    set('G', `$C$11-C${r}`);
  }
  paint(ws, 11, 14, 1, 7, 'calc');
  widths(ws, [12, 13, 11, 10, 12, 10, 10, 10, 7, 12, 12]);
}

// ================================ TODAY ===========================================
{
  const ws = tabs.TODAY;
  title(ws, "TODAY - automatic: tonight's schedule",
    `After midnight still counts as the same night until ${'05:00'} (rollover hour in SETUP). Type a date in F3 to look at another night; clear it to go back to today.`);
  ws.getCell('B3').value = 'Showing night of:';
  ws.getCell('B3').font = { bold: true };
  ws.getCell('C3').value = f(`IF(F3<>"",F3,IF(HOUR(NOW())<${SET.rollover},TODAY()-1,TODAY()))`);
  ws.getCell('C3').numFmt = 'ddd dd-mmm-yyyy';
  ws.getCell('C3').fill = fill(C.calc);
  ws.getCell('E3').value = 'Pick a date (optional):';
  ws.getCell('F3').fill = fill(C.input);
  ws.getCell('F3').numFmt = 'dd-mmm-yyyy';
  header(ws, 5, 1, ['#', 'Start', 'End', 'Event / Match', 'Team A', 'Team B', 'Venue', 'Status', 'Score', 'Winner', 'Row']);
  const src = { B: 'C', C: 'D', D: 'Q', E: 'V', F: 'W', G: 'U', H: 'L', I: 'M', J: 'N' };
  for (let r = T_FIRST; r <= T_LAST; r++) {
    ws.getCell(`A${r}`).value = r - T_FIRST + 1;
    ws.getCell(`K${r}`).value = f(`IFERROR(MATCH(A${r},${MR('AF')},0),"")`);
    for (const [col, mcol] of Object.entries(src)) {
      ws.getCell(`${col}${r}`).value = f(`IF($K${r}="","",IF(INDEX(${MR(mcol)},$K${r})="","",INDEX(${MR(mcol)},$K${r})))`);
    }
    ws.getCell(`B${r}`).numFmt = 'hh:mm';
    ws.getCell(`C${r}`).numFmt = 'hh:mm';
  }
  paint(ws, T_FIRST, T_LAST, 1, 11, 'calc');
  widths(ws, [4, 7, 7, 30, 12, 12, 18, 11, 18, 12, 5]);
  ws.getColumn(11).hidden = true;
  ws.views = [{ state: 'frozen', ySplit: 5 }];
}

// ================================ BRACKETS ========================================
{
  const ws = tabs.BRACKETS;
  title(ws, 'BRACKETS - automatic semi-finals, finals and podiums (do not edit)',
    'Final teams fill in automatically when a semi-final is marked Completed/Walkover with a winner.');
  header(ws, 3, 1, ['Event', 'Format', 'Semi 1 Team A', 'Semi 1 Team B', 'Semi 1 Winner', 'Semi 2 Team A',
    'Semi 2 Team B', 'Semi 2 Winner', 'Final Team A', 'Final Team B', 'Champion', 'Runner-up', 'Status']);
  for (let r = B_FIRST; r <= B_LAST; r++) {
    const er = E_FIRST + (r - B_FIRST);
    const set = (col, formula) => { ws.getCell(`${col}${r}`).value = f(formula); };
    const pick = (mcol, stage) => `IF(OR($A${r}="",$B${r}<>"Knockout"),"",IFERROR(INDEX(${MR(mcol)},MATCH($A${r}&"|${stage}",${MR('AA')},0))&"",""))`;
    set('A', `IF(SETUP!A${er}="","",SETUP!A${er}&"")`);
    set('B', `IF($A${r}="","",SETUP!D${er}&"")`);
    set('C', pick('V', 'Semi 1'));
    set('D', pick('W', 'Semi 1'));
    set('E', pick('Y', 'Semi 1'));
    set('F', pick('V', 'Semi 2'));
    set('G', pick('W', 'Semi 2'));
    set('H', pick('Y', 'Semi 2'));
    set('I', pick('V', 'Final'));
    set('J', pick('W', 'Final'));
    const finalKey = `$A${r}&"|"&IF($B${r}="Knockout","Final","Single round")`;
    set('K', `IF($A${r}="","",IFERROR(INDEX(${MR('Y')},MATCH(${finalKey},${MR('AA')},0))&"",""))`);
    set('L', `IF($A${r}="","",IFERROR(INDEX(${MR('Z')},MATCH(${finalKey},${MR('AA')},0))&"",""))`);
    set('M', `IF($A${r}="","",IFERROR(INDEX(${PR('O')},MATCH($A${r}&"|"&SETUP!$A$5,${PR('N')},0)),""))`);
  }
  paint(ws, B_FIRST, B_LAST, 1, 13, 'calc');
  widths(ws, [17, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]);
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 3 }];
}

// ================================ DASHBOARD =======================================
{
  const ws = tabs.DASHBOARD;
  title(ws, 'DASHBOARD - tournament summary (automatic)');
  header(ws, 3, 1, ['Metric', 'Value']);
  const nextAt = `MIN(${MR('AI')})`;
  const lastAt = `MAX(${MR('AJ')})`;
  const metrics = [
    ['Leader', 'LEADERBOARD!B11'],
    ['Leader points', 'LEADERBOARD!C11'],
    ['Lead over 2nd', 'LEADERBOARD!C11-LEADERBOARD!C12'],
    ['Events decided', `SUMPRODUCT(--(LEN(BRACKETS!$K$${B_FIRST}:$K$${B_LAST})>0))&" of "&SUMPRODUCT(--(LEN(BRACKETS!$A$${B_FIRST}:$A$${B_LAST})>0))`],
    ['Matches completed', `COUNTIF(${MR('X')},"Yes")&" of "&COUNTIF(${MR('E')},"Sport")`],
    ['Live now (count)', `COUNTIF(${MR('L')},"Live")`],
    ['Next match', `IF(${nextAt}=0,"-",INDEX(${MR('Q')},MATCH(${nextAt},${MR('AI')},0)))`],
    ['Next match starts', `IF(${nextAt}=0,"-",${nextAt})`],
    ['Latest result', `IF(${lastAt}=0,"-",INDEX(${MR('Q')},MATCH(${lastAt},${MR('AJ')},0))&": "&INDEX(${MR('N')},MATCH(${lastAt},${MR('AJ')},0))&" won")`],
    ['DON declared', `SUMPRODUCT(--(LEN(DON!$B$4:$B$7)>0))&" of 4"`],
    ['DON won (x2)', `COUNTIF(DON!$G$4:$G$7,"1st")`],
    ['DON penalties (-100)', `COUNTIF(DON!$G$4:$G$7,"Out")`],
    ['Weasley challenges won', `COUNTIF(DON!$F$${W_FIRST}:$F$${W_LAST},"Won")&" of "&SUMPRODUCT(--(LEN(DON!$A$${W_FIRST}:$A$${W_LAST})>0))`],
    ['Total points on the board', 'SUM(LEADERBOARD!$F$4:$F$7)'],
    ['Data problems in MATCHES', `SUMPRODUCT(--(LEN(${MR('AG')})>0))`],
  ];
  metrics.forEach(([k, formula], i) => {
    ws.getCell(4 + i, 1).value = k;
    ws.getCell(4 + i, 2).value = f(formula);
  });
  ws.getCell(4 + 7, 2).numFmt = 'ddd dd-mmm hh:mm';
  paint(ws, 4, 3 + metrics.length, 1, 2, 'calc');

  const lr = 5 + metrics.length;
  ws.getCell(lr, 1).value = 'LIVE NOW';
  ws.getCell(lr, 1).font = { bold: true };
  header(ws, lr + 1, 1, ['Match', 'Team A', 'Team B', 'Score', 'Row']);
  for (let k = 1; k <= 6; k++) {
    const r = lr + 1 + k;
    ws.getCell(`E${r}`).value = f(`IFERROR(MATCH(${k},${MR('AH')},0),"")`);
    const g = (mcol) => f(`IF($E${r}="","",INDEX(${MR(mcol)},$E${r})&"")`);
    ws.getCell(`A${r}`).value = g('Q');
    ws.getCell(`B${r}`).value = g('V');
    ws.getCell(`C${r}`).value = g('W');
    ws.getCell(`D${r}`).value = g('M');
  }
  paint(ws, lr + 2, lr + 7, 1, 5, 'calc');
  ws.getColumn(5).hidden = true;

  const sr = lr + 9;
  ws.getCell(sr, 1).value = 'STANDINGS';
  ws.getCell(sr, 1).font = { bold: true };
  header(ws, sr + 1, 1, ['House', 'Total', '1st places', '2nd places']);
  for (let k = 1; k <= 4; k++) {
    const r = sr + 1 + k;
    ws.getCell(`A${r}`).value = f(`LEADERBOARD!B${10 + k}`);
    ws.getCell(`B${r}`).value = f(`LEADERBOARD!C${10 + k}`);
    ws.getCell(`C${r}`).value = f(`LEADERBOARD!D${10 + k}`);
    ws.getCell(`D${r}`).value = f(`LEADERBOARD!E${10 + k}`);
  }
  paint(ws, sr + 2, sr + 5, 1, 4, 'calc');
  widths(ws, [30, 34, 12, 18, 5]);
}

await wb.xlsx.writeFile(OUT);
console.log(`Wrote ${OUT}`);
