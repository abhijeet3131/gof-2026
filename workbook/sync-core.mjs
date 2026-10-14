// Loads the pure functions from apps-script/ScheduleSync.gs into Node, so the exact
// code that runs inside Google Sheets is also used by the workbook builder and the tests.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SYNC_SCRIPT = path.join(here, '..', 'apps-script', 'ScheduleSync.gs');

export function loadSyncCore() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(SYNC_SCRIPT, 'utf8'), context, { filename: 'ScheduleSync.gs' });
  const pick = ['GOF', 'gofNorm', 'gofParseTime', 'gofFmtTime', 'gofFindLayout', 'gofParseLabel', 'gofReadGrid', 'gofPlanSync', 'gofColName'];
  return Object.fromEntries(pick.map((k) => [k, vm.runInContext(k, context)]));
}

/**
 * Builds the grid model (what Sheets would return) from the compact GRID definition in data.mjs.
 * Sheet layout: row 1 title, row 2 "Date"/"Day"/"Next Date", row 3 times, data from row 4;
 * column B = Date, C = Day, D.. = time columns.
 */
export function gridModel({ columns, rows }) {
  const FIRST_COL = 3; // 0-based index of column D
  const width = FIRST_COL + columns.length;
  const blankRow = () => Array(width).fill('');
  const display = [blankRow(), blankRow(), blankRow()];
  display[0][1] = 'SCHEDULE';
  display[1][1] = 'Date';
  display[1][2] = 'Day';
  const nextDateCol = FIRST_COL + columns.indexOf('0:00');
  display[1][nextDateCol] = 'Next Date';
  columns.forEach((t, i) => { display[2][FIRST_COL + i] = t; });
  const merges = [
    { row: 0, col: 1, rows: 1, cols: width - 1 },
    { row: 1, col: 1, rows: 2, cols: 1 },
    { row: 1, col: 2, rows: 2, cols: 1 },
    { row: 1, col: nextDateCol, rows: 1, cols: width - nextDateCol },
  ];
  const isoDates = ['', '', ''];
  const cells = []; // {row, col, span, label} for styling
  const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  rows.forEach(([iso, slots], i) => {
    const r = 3 + i;
    const row = blankRow();
    row[1] = iso;
    row[2] = WEEKDAY[new Date(iso + 'T00:00:00Z').getUTCDay()];
    for (const [label, start, span] of slots) {
      const col = FIRST_COL + columns.indexOf(start);
      if (col < FIRST_COL) throw new Error(`Unknown grid column "${start}"`);
      row[col] = label;
      if (span > 1) merges.push({ row: r, col, rows: 1, cols: span });
      cells.push({ row: r, col, span, label });
    }
    display.push(row);
    isoDates.push(iso);
  });
  return { display, isoDates, merges, cells, firstCol: FIRST_COL };
}
