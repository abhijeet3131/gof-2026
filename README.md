# Goblet of Fire 2026 — live tournament app

A mobile-friendly web app that shows the House Cup standings, match schedule, live and completed matches, brackets, and Double or Nothing picks. SCAM edits **one Google Sheet** and the app updates by itself.

```
SCAM edits Google Sheet ──► Cloudflare Pages Function /api/data ──► Web app on students' phones
 (inputs + formulas)        reads the sheet, cached ~20 s      re-checks every 30 s
```

| Doc | For |
|---|---|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | One-time setup: Google Sheet, API key, GitHub, Cloudflare Pages |
| [docs/SCAM_GUIDE.md](docs/SCAM_GUIDE.md) | SCAM members updating the sheet during the tournament |
| [docs/LIMITATIONS.md](docs/LIMITATIONS.md) | Limitations, known issues and future improvements |

## What's in this folder

| Path | What it is |
|---|---|
| `GOF_2026_Workbook.xlsx` | The workbook to upload to Google Sheets (generated, pre-filled with the draft schedule) |
| `workbook/data.mjs` | Houses, events, fixtures, Weasley challenges and the SCHEDULE grid used to generate the workbook |
| `apps-script/ScheduleSync.gs` | Google Apps Script pasted into the sheet: syncs the SCHEDULE grid into MATCHES (see DEPLOYMENT Part F) |
| `workbook/sync-core.mjs` | Runs the same sync logic in Node, for the workbook builder and tests |
| `workbook/build.mjs` | Generates the workbook: tabs, formulas, dropdowns, checks |
| `workbook/test.mjs` | 74 scoring checks run against the **real workbook formulas** |
| `workbook/make-demo.mjs` | Builds the demo data shown when no sheet is connected |
| `server/data.mjs` | Core of the `/api/data` endpoint: reads Google Sheets, keeps a short copy, ETags, stale fallback |
| `server/parse.mjs` | Converts sheet tabs into the app's JSON (finds tables by their header text) |
| `server/fixtures/demo.json` | Demo data shown when no sheet is connected |
| `functions/api/data.js` | Cloudflare Pages Function for `/api/data` (adds a 20-second edge cache) |
| `netlify/functions/data.mjs`, `netlify.toml` | Optional: the same endpoint for Netlify |
| `public/_headers`, `wrangler.toml`, `.node-version` | Hosting config (caching rules, Cloudflare project, Node version) |
| `src/` | React app (pages: Standings, Schedule, Sports, DON) |
| `public/brand/`, `public/fonts/` | Web-ready copies of the official GOF logo, house mascots, SCAM and MICA logos, and the Collegiate font (commercial use allowed). The full design source files stay in `GOF Assets visual/` and are not committed. |
| `tests/` | Unit tests for the parser, time logic and the function |

## Commands

```bash
npm install
```

```bash
npm run dev
```
Starts the app at http://localhost:5173. Without a `.env` it shows demo data. Add `?now=2026-10-23T23:45` to the URL to preview the app as if it were that time (IST).

```bash
npm run cf:dev
```
Builds the app and runs it in Cloudflare's local runtime at http://127.0.0.1:8788 (put the two Google variables in a `.dev.vars` file to use the real sheet).

```bash
npm test
```
Runs the workbook formula tests and the app tests.

```bash
npm run workbook
```
Regenerates `GOF_2026_Workbook.xlsx`. ⚠️ This creates a **fresh, empty** workbook. Once the tournament is running, the live data is in Google Sheets. Don't re-upload a regenerated file over it.

## How scoring works (as agreed with SCAM)

- 1st/2nd place points per event come from the rulebook (`SETUP` tab). Men's and women's events are separate, and each awards full points.
- **Double or Nothing:**
  - One event (sport + gender) per house. Not allowed on E-Sports or Athletics, or on the house's Weasley Challenge sport.
  - 1st place = points × 2. 2nd place = 0.
  - Out (lost a semifinal, not in the top 2, or a no-show) = −100, applied as soon as it is certain.
- **Weasley Challenge:** the challenger gets +50 for winning the locked semifinal and −50 for losing it. The challenged house is unaffected.
- A team that doesn't show up for a final still gets 2nd place.
- **Finalists score early (website only, from 18 Oct):** a house that wins a knockout semi-final gets the event's 2nd-place points straight away, and counts as a 2nd place in the tiebreak. The winner gets the rest once the final is entered. Sports with a DON pick on them (by any house) still score only after the final. The app adds these points itself (`withFinalists` in `src/lib/derive.js`), so the sheet's LEADERBOARD shows less than the app until each final is played.
- **Ties:** decided by more 1st places, then more 2nd places. If still level, the houses share the rank.
- SCAM adjustments (bonuses or penalties) are added from the `ADJUSTMENTS` tab.
