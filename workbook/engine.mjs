// Loads the generated .xlsx into HyperFormula so the real sheet formulas can be
// evaluated in Node (used by the tests and to produce the demo data snapshot).

import ExcelJS from 'exceljs';
import { HyperFormula } from 'hyperformula';

export const SHEETS = ['SETUP', 'MATCHES', 'DON', 'ADJUSTMENTS', 'POINTS_LOG', 'LEADERBOARD', 'TODAY', 'BRACKETS', 'DASHBOARD'];

const colToNum = (letters) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
export function parseAddr(addr) {
  const m = /^([A-Z]+)(\d+)$/.exec(addr);
  return { col: colToNum(m[1]) - 1, row: Number(m[2]) - 1 };
}

export const serial = (iso, hhmm = '00:00') => {
  const [y, mo, d] = iso.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return (Date.UTC(y, mo - 1, d) - Date.UTC(1899, 11, 30)) / 86400000 + (h * 60 + mi) / 1440;
};

/**
 * @param {string} file  path to the xlsx
 * @param {{now?: number}} opts  `now` = Excel serial used for NOW()/TODAY() (frozen for tests)
 */
export async function loadWorkbook(file, opts = {}) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheets = {};
  for (const name of SHEETS) {
    const ws = wb.getWorksheet(name);
    const grid = [];
    ws.eachRow({ includeEmpty: true }, (row, r) => {
      const out = [];
      row.eachCell({ includeEmpty: true }, (cell, c) => {
        let v = cell.value;
        if (v && typeof v === 'object' && 'formula' in v) {
          let fx = v.formula;
          if (opts.now !== undefined) {
            fx = fx.replaceAll('NOW()', `(${opts.now})`).replaceAll('TODAY()', `(${Math.floor(opts.now)})`);
          }
          v = '=' + fx;
        } else if (v instanceof Date) {
          v = (v.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
        } else if (v && typeof v === 'object' && 'richText' in v) {
          v = v.richText.map((t) => t.text).join('');
        }
        out[c - 1] = v ?? null;
      });
      grid[r - 1] = out;
    });
    for (let i = 0; i < grid.length; i++) grid[i] = grid[i] || [];
    sheets[name] = grid;
  }
  const hf = HyperFormula.buildFromSheets(sheets, { licenseKey: 'gpl-v3', useWildcards: true, caseSensitive: false, useArrayArithmetic: true });
  const id = (sheet) => hf.getSheetId(sheet);

  const api = {
    hf,
    get(sheet, addr) {
      const { row, col } = parseAddr(addr);
      return hf.getCellValue({ sheet: id(sheet), row, col });
    },
    set(sheet, addr, value) {
      const { row, col } = parseAddr(addr);
      hf.setCellContents({ sheet: id(sheet), row, col }, [[value]]);
    },
    /** All computed values of a sheet as a 2D array (like the Sheets API with UNFORMATTED_VALUE). */
    values(sheet) {
      return hf.getSheetValues(id(sheet)).map((row) =>
        row.map((v) => (v && typeof v === 'object' && 'type' in v ? `#${v.type}` : v)));
    },
    /** Find the MATCHES row whose Key column equals "Event|Stage". */
    matchRow(event, stage) {
      const vals = hf.getSheetValues(id('MATCHES'));
      const keyCol = colToNum('AA') - 1;
      for (let r = 3; r < vals.length; r++) if (vals[r][keyCol] === `${event}|${stage}`) return r + 1;
      throw new Error(`No MATCHES row for ${event}|${stage}`);
    },
    /** Record a result for a match: { winner, second, status } */
    result(event, stage, { winner, second, status = 'Completed', score } = {}) {
      const r = api.matchRow(event, stage);
      api.set('MATCHES', `L${r}`, status);
      if (winner !== undefined) api.set('MATCHES', `N${r}`, winner);
      if (second !== undefined) api.set('MATCHES', `O${r}`, second);
      if (score !== undefined) api.set('MATCHES', `M${r}`, score);
      return r;
    },
    don(house, event) {
      const rows = { Gryffindor: 4, Slytherin: 5, Ravenclaw: 6, Hufflepuff: 7 };
      api.set('DON', `B${rows[house]}`, event);
    },
    standings() {
      const out = {};
      for (let r = 4; r <= 7; r++) {
        out[api.get('LEADERBOARD', `A${r}`)] = {
          event: api.get('LEADERBOARD', `B${r}`), don: api.get('LEADERBOARD', `C${r}`),
          weasley: api.get('LEADERBOARD', `D${r}`), adj: api.get('LEADERBOARD', `E${r}`),
          total: api.get('LEADERBOARD', `F${r}`), firsts: api.get('LEADERBOARD', `G${r}`),
          seconds: api.get('LEADERBOARD', `H${r}`), rank: api.get('LEADERBOARD', `I${r}`),
        };
      }
      return out;
    },
    order() {
      return [11, 12, 13, 14].map((r) => api.get('LEADERBOARD', `B${r}`));
    },
  };
  return api;
}
