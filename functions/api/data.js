// Cloudflare Pages Function: GET /api/data
// Keeps each response in Cloudflare's edge cache for 20 seconds (per data centre),
// so however many students are refreshing, Google is asked only a few times a minute.

import { loadData, respond } from '../../server/data.mjs';

const EDGE_TTL_SECONDS = 20;

export async function onRequestGet(context) {
  const { request, env } = context;
  const cache = caches.default;
  const key = new Request(new URL('/api/data', request.url).toString());
  // Diagnostics: was this answered from the edge cache, and by which Cloudflare data centre?
  const diag = (state) => ({ 'X-GOF-Cache': state, 'X-GOF-Colo': request.cf?.colo || 'local' });

  // Tournament over: serve the frozen final results (public/data/final.json) and stop reading
  // Google Sheets, so later edits to the sheet can't change the site. Delete that file to go live again.
  if (env?.ASSETS) {
    const frozen = await env.ASSETS.fetch(new URL('/data/final.json', request.url));
    if (frozen.ok && (frozen.headers.get('content-type') || '').includes('json')) {
      return respond(request, { status: 200, body: await frozen.text(), etag: frozen.headers.get('etag') || '' }, { 'X-GOF-Source': 'frozen' });
    }
  }

  const hit = await cache.match(key);
  if (hit) {
    return respond(request, { status: 200, body: await hit.text(), etag: hit.headers.get('ETag') || '' }, diag('HIT'));
  }

  const data = await loadData(env);
  if (data.cacheable) {
    context.waitUntil(cache.put(key, new Response(data.body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${EDGE_TTL_SECONDS}`,
        ETag: data.etag,
      },
    })).catch((err) => console.error('edge cache put failed', err)));
  }
  return respond(request, data, data.cacheable ? diag('MISS') : { 'Cache-Control': 'no-store', ...diag('MISS') });
}
