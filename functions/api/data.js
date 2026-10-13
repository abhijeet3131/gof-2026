// Cloudflare Pages Function: GET /api/data
// Keeps each response in Cloudflare's edge cache for 20 seconds (per data centre),
// so however many students are refreshing, Google is asked only a few times a minute.

import { loadData, respond } from '../../server/data.mjs';

const EDGE_TTL_SECONDS = 20;

export async function onRequestGet({ request, env, waitUntil }) {
  const cache = caches.default;
  const key = new Request(new URL('/api/data', request.url).toString());

  const hit = await cache.match(key);
  if (hit) {
    return respond(request, { status: 200, body: await hit.text(), etag: hit.headers.get('ETag') || '' });
  }

  const data = await loadData(env);
  if (data.cacheable) {
    waitUntil(cache.put(key, new Response(data.body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${EDGE_TTL_SECONDS}`,
        ETag: data.etag,
      },
    })));
  }
  return respond(request, data, data.cacheable ? {} : { 'Cache-Control': 'no-store' });
}
