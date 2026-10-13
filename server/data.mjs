// Platform-neutral core of the /api/data endpoint: reads the GOF workbook from
// Google Sheets, turns it into the app's JSON, and keeps a short in-memory copy.
// Used by the Cloudflare Pages Function (functions/api/data.js), the optional
// Netlify function, and the local dev server. Only Web-standard APIs are used.
//
// Settings (Cloudflare: Pages project > Settings > Variables and Secrets):
//   GOOGLE_SHEET_ID  - the long id in the sheet URL (.../spreadsheets/d/<ID>/edit)
//   GOOGLE_API_KEY   - Google Cloud API key with the Google Sheets API enabled
// Without them the endpoint serves bundled demo data (flagged meta.demo = true).

import { buildPayload } from './parse.mjs';
import demoSheets from './fixtures/demo.json';

const TABS = ['SETUP', 'MATCHES', 'DON', 'ADJUSTMENTS', 'LEADERBOARD', 'POINTS_LOG', 'BRACKETS'];
const MEMORY_TTL_MS = 15_000;

let memo = null; // { at, payload, body, etag } — per warm instance

async function fetchSheets(sheetId, apiKey) {
  const params = new URLSearchParams({
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER',
    key: apiKey,
  });
  for (const t of TABS) params.append('ranges', t);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchGet?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google Sheets API ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const sheets = {};
  for (const vr of json.valueRanges || []) {
    const name = vr.range.split('!')[0].replace(/^'|'$/g, '');
    sheets[name] = vr.values || [];
  }
  return sheets;
}

// The ETag ignores fetchedAt so it only changes when the tournament data changes.
async function pack(payload) {
  const { fetchedAt, ...metaRest } = payload.meta;
  const bytes = new TextEncoder().encode(JSON.stringify({ ...payload, meta: metaRest }));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes));
  const hash = btoa(String.fromCharCode(...digest)).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' }[c])).slice(0, 20);
  return { payload, body: JSON.stringify(payload), etag: `W/"${hash}"` };
}

/**
 * Returns { status, body, etag, cacheable }.
 * cacheable=false for error responses and for stale fallbacks (so a CDN won't keep them).
 */
export async function loadData(env = {}) {
  const sheetId = env.GOOGLE_SHEET_ID;
  const apiKey = env.GOOGLE_API_KEY;

  if (!sheetId || !apiKey) {
    const p = await pack(buildPayload(demoSheets, { demo: true, fetchedAt: new Date().toISOString() }));
    return { status: 200, body: p.body, etag: p.etag, cacheable: true };
  }

  if (memo && Date.now() - memo.at < MEMORY_TTL_MS) return { status: 200, body: memo.body, etag: memo.etag, cacheable: true };

  try {
    const sheets = await fetchSheets(sheetId, apiKey);
    memo = { at: Date.now(), ...(await pack(buildPayload(sheets, { demo: false, fetchedAt: new Date().toISOString() }))) };
    return { status: 200, body: memo.body, etag: memo.etag, cacheable: true };
  } catch (err) {
    console.error(err);
    if (memo) {
      // Serve the last good copy, flagged as stale so the app can say so.
      const stale = await pack({ ...memo.payload, meta: { ...memo.payload.meta, stale: true } });
      return { status: 200, body: stale.body, etag: stale.etag, cacheable: false };
    }
    return {
      status: 502, etag: '', cacheable: false,
      body: JSON.stringify({ error: 'Could not read the tournament sheet. Please try again shortly.' }),
    };
  }
}

/** Builds the HTTP response, answering 304 when the browser already has this version. */
export function respond(request, { status, body, etag }, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    ...(etag ? { ETag: etag } : {}),
    ...extraHeaders,
  };
  if (status === 200 && etag && request?.headers?.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { status, headers });
}

/** Test hook: forget the in-memory copy. */
export function _resetMemo() { memo = null; }
