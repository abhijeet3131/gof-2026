// Optional Netlify version of GET /api/data (the site is hosted on Cloudflare Pages;
// see functions/api/data.js). Kept so the app can still be deployed to Netlify.

import { loadData, respond } from '../../server/data.mjs';

export default async function handler(request) {
  const data = await loadData(process.env);
  return respond(request, data, {
    'Netlify-CDN-Cache-Control': data.cacheable ? 'public, durable, s-maxage=20, stale-while-revalidate=120' : 'no-store',
  });
}

export const config = { path: '/api/data' };
