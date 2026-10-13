import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In `npm run dev`, serve /api/data from the same server code the Cloudflare
// Pages Function uses. Put GOOGLE_SHEET_ID / GOOGLE_API_KEY in a local .env
// file to test against the real sheet (otherwise demo data).
function apiDev() {
  return {
    name: 'gof-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/data', async (req, res) => {
        try {
          const { loadData, respond } = await server.ssrLoadModule('/server/data.mjs');
          const headers = new Headers();
          if (req.headers['if-none-match']) headers.set('if-none-match', req.headers['if-none-match']);
          const request = new Request('http://localhost/api/data', { headers });
          const response = respond(request, await loadData(process.env));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(response.status === 304 ? undefined : await response.text());
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [react(), apiDev()],
    test: { include: ['tests/**/*.test.mjs'] },
  };
});
