import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import demo from '../server/fixtures/demo.json';

// Shape a fake Google Sheets batchGet response from the demo grids.
const googleResponse = () => new Response(JSON.stringify({
  valueRanges: Object.entries(demo).map(([name, values]) => ({ range: `${name}!A1:AJ1000`, values })),
}));
const ENV = { GOOGLE_SHEET_ID: 'sheet123', GOOGLE_API_KEY: 'key456' };

async function fresh(path) {
  vi.resetModules();
  return import(path);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete globalThis.caches;
});

describe('server core (loadData / respond)', () => {
  it('serves demo data when not configured', async () => {
    const { loadData } = await fresh('../server/data.mjs');
    const data = await loadData({});
    const body = JSON.parse(data.body);
    expect(data).toMatchObject({ status: 200, cacheable: true });
    expect(body.meta.demo).toBe(true);
    expect(body.standings).toHaveLength(4);
  });

  it('reads the sheet once, keeps it in memory, and answers 304 for an unchanged ETag', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => googleResponse());
    const { loadData, respond } = await fresh('../server/data.mjs');
    const first = await loadData(ENV);
    const body = JSON.parse(first.body);
    expect(body.meta.demo).toBe(false);
    expect(body.standings[0].house).toBe('Ravenclaw');
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('/spreadsheets/sheet123/values:batchGet');
    expect(url).toContain('valueRenderOption=UNFORMATTED_VALUE');

    const second = await loadData(ENV);
    expect(fetchMock).toHaveBeenCalledTimes(1);            // served from memory
    const res = respond(new Request('http://x/api/data', { headers: { 'if-none-match': second.etag } }), second);
    expect(res.status).toBe(304);
  });

  it('falls back to the last good copy (flagged stale, not cacheable) when Google fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => googleResponse());
    const { loadData } = await fresh('../server/data.mjs');
    await loadData(ENV);
    vi.useFakeTimers({ now: Date.now() + 60_000, toFake: ['Date'] });
    fetchMock.mockImplementationOnce(async () => new Response('quota exceeded', { status: 429 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const data = await loadData(ENV);
    expect(data).toMatchObject({ status: 200, cacheable: false });
    expect(JSON.parse(data.body).meta.stale).toBe(true);
  });

  it('returns 502 when Google fails and there is no cached copy', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('forbidden', { status: 403 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { loadData, respond } = await fresh('../server/data.mjs');
    const res = respond(new Request('http://x/api/data'), await loadData(ENV));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/Could not read/);
  });
});

describe('Cloudflare Pages Function (functions/api/data.js)', () => {
  beforeEach(() => {
    const store = new Map();
    globalThis.caches = {
      default: {
        match: async (req) => store.get(req.url)?.clone(),
        put: async (req, res) => { store.set(req.url, res); },
      },
    };
  });

  it('caches the sheet at the edge and serves later requests from the cache', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => googleResponse());
    const { onRequestGet } = await fresh('../functions/api/data.js');
    const pending = [];
    const ctx = (headers = {}) => ({ request: new Request('https://gof.pages.dev/api/data', { headers }), env: ENV, waitUntil: (p) => pending.push(p) });

    const first = await onRequestGet(ctx());
    await Promise.all(pending);
    expect(first.status).toBe(200);
    const etag = first.headers.get('ETag');
    expect(etag).toMatch(/^W\/"/);
    expect((await first.json()).meta.demo).toBe(false);

    const second = await onRequestGet(ctx());
    expect(second.status).toBe(200);
    expect((await second.json()).standings[0].house).toBe('Ravenclaw');
    const third = await onRequestGet(ctx({ 'if-none-match': etag }));
    expect(third.status).toBe(304);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not cache error responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('forbidden', { status: 403 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { onRequestGet } = await fresh('../functions/api/data.js');
    const put = vi.spyOn(globalThis.caches.default, 'put');
    const res = await onRequestGet({ request: new Request('https://gof.pages.dev/api/data'), env: ENV, waitUntil: () => {} });
    expect(res.status).toBe(502);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(put).not.toHaveBeenCalled();
  });

  it('serves the frozen final results when public/data/final.json exists, without asking Google', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const { onRequestGet } = await fresh('../functions/api/data.js');
    const frozen = JSON.stringify({ meta: { frozen: true }, standings: [] });
    const ASSETS = { fetch: async (url) => (String(url).endsWith('/data/final.json')
      ? new Response(frozen, { headers: { 'content-type': 'application/json', etag: '"abc"' } })
      : new Response('<html>', { headers: { 'content-type': 'text/html' } })) };
    const res = await onRequestGet({ request: new Request('https://gof.pages.dev/api/data'), env: { ...ENV, ASSETS }, waitUntil: () => {} });
    expect(res.headers.get('X-GOF-Source')).toBe('frozen');
    expect((await res.json()).meta.frozen).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    const again = await onRequestGet({ request: new Request('https://gof.pages.dev/api/data', { headers: { 'if-none-match': '"abc"' } }), env: { ...ENV, ASSETS }, waitUntil: () => {} });
    expect(again.status).toBe(304);
  });

  it('goes back to the live sheet when the frozen file is gone (Pages answers with the HTML page)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => googleResponse());
    const { onRequestGet } = await fresh('../functions/api/data.js');
    const ASSETS = { fetch: async () => new Response('<html>', { headers: { 'content-type': 'text/html' } }) };
    const res = await onRequestGet({ request: new Request('https://gof.pages.dev/api/data'), env: { ...ENV, ASSETS }, waitUntil: () => {} });
    expect(res.headers.get('X-GOF-Source')).toBeNull();
    expect((await res.json()).meta.demo).toBe(false);
  });
});

describe('optional Netlify wrapper', () => {
  it('adds Netlify CDN caching headers', async () => {
    const { default: handler } = await fresh('../netlify/functions/data.mjs');
    const res = await handler(new Request('http://x/api/data'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Netlify-CDN-Cache-Control')).toContain('s-maxage=20');
  });
});
