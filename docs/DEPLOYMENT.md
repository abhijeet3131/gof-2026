# Deployment guide (one-time setup, ~40 minutes)

You need:
- a Google account. Ideally a shared SCAM account, so the sheet and key don't depend on one person.
- a GitHub account.
- a Cloudflare account (free; sign up at dash.cloudflare.com).

Everything here is on free plans.

---

## Part A — Put the workbook in Google Sheets (10 min)

1. Go to **drive.google.com** → **New → File upload**. Pick `GOF_2026_Workbook.xlsx`.
2. Open the uploaded file, then **File → Save as Google Sheets**. Use this new copy from now on. The app can't read the `.xlsx` file directly.
3. **File → Settings**:
   - **General** tab: Locale **India**, Time zone **(GMT+05:30) India Standard Time**.
   - **Calculation** tab: Recalculation **"On change and every minute"**. The TODAY tab and "next match" depend on the clock.
   - Click **Save settings**.
4. Check the import worked:
   - **DASHBOARD**:
     - "Data problems in MATCHES" = **0**
     - "Events decided" = **0 of 21**
     - "Matches completed" = **0 of 51**
     - No `#ERROR!` / `#REF!` cells
   - **MATCHES**: click a yellow **Status** cell. A dropdown (Scheduled, Live, …) appears.
   - **DON**: the **DON event** dropdown lists 15 events, with no FIFA, BGMI or athletics.
   - **TODAY**: shows tonight's date.

   If anything here looks wrong, stop and send me a screenshot.
5. **Share** (top right):
   - Under **General access**, choose **Anyone with the link → Viewer**. This is required so the app can read the sheet. Everything in it is shown publicly in the app anyway.
   - Add each SCAM scorer by email as **Editor**.
6. Copy the **sheet ID** from the address bar: `https://docs.google.com/spreadsheets/d/`**`THIS_LONG_PART`**`/edit`.
7. **Protect the formula areas.** Use **Data → Protect sheets and ranges → Add a sheet or range**. For each item below, set permissions to "Only you" (or the 1–2 sheet admins):
   - Whole sheets: `SETUP`, `POINTS_LOG`, `LEADERBOARD`, `BRACKETS`, `DASHBOARD`.
   - `TODAY`: the whole sheet **except** cell `F3`.
   - `MATCHES`: range `Q3:AJ203` (the grey columns) and row 3 (headers).
   - `DON`: ranges `A3:A7`, `D3:J7`, `D11:G15`. After DON declarations close, also protect `B4:C7`.
   - `ADJUSTMENTS`: you may want to limit this whole sheet to the SCAM heads.

> Don't rename tabs or change header text. The app finds each table by its header names.

## Part B — Create the Google API key (10 min)

1. Go to **console.cloud.google.com** and sign in with the same Google account.
2. Use the project picker (top-left) → **New project** → name it `GOF 2026` → **Create**, then select it.
3. **APIs & Services → Library** → search **Google Sheets API** → **Enable**.
4. **APIs & Services → Credentials → + Create credentials → API key**. Copy the key.
5. Click **Edit API key**:
   - **API restrictions** → **Restrict key** → tick **Google Sheets API** → **Save**.
   - **Application restrictions**: leave as **None**. Only the Cloudflare server code uses the key; it never reaches students' phones.
6. Treat the key as a password. Don't post it in WhatsApp, email or GitHub.

No billing account is needed. The app makes about 3 reads a minute; the free limit is 300 a minute.

## Part C — Put the code on GitHub (5 min)

1. On github.com, create a **new private repository** called `gof-2026`. Leave it empty: no README.
2. In this project folder, run the following. Replace `YOUR-USERNAME`.

```bash
git init
```
```bash
git add .
```
```bash
git commit -m "GOF 2026 app"
```
```bash
git branch -M main
```
```bash
git remote add origin https://github.com/YOUR-USERNAME/gof-2026.git
```
```bash
git push -u origin main
```

`.gitignore` already keeps `node_modules`, `dist` and any `.env` file out of Git.

## Part D — Deploy on Cloudflare Pages (10 min)

1. Go to **dash.cloudflare.com** and sign up or log in.
2. In the left menu open **Workers & Pages → Create application**. Choose the **Pages** option: **Import an existing Git repository** (it may be labelled "Connect to Git").
   - If you only see Workers options, look for the "Looking to deploy Pages? Get started" link.
3. Connect your GitHub account and pick the `gof-2026` repository.
4. **Project name:** for example `gof2026`. This becomes the address: `https://gof2026.pages.dev`.
5. **Build settings:**
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Leave the root directory empty. Cloudflare finds the `functions/` folder (the `/api/data` endpoint) and the Node version (`.node-version`) by itself.
6. Open **Environment variables (advanced)** and add both of these. Click **Encrypt** on the API key.
   - `GOOGLE_SHEET_ID` = the ID from Part A, step 6
   - `GOOGLE_API_KEY` = the key from Part B
7. Click **Save and Deploy**. The first build takes 1–2 minutes.

To change the variables later: **your project → Settings → Variables and Secrets**. Then redeploy (**Deployments → ⋯ on the latest one → Retry deployment**), because variables only apply to new deployments.

## Part E — Check it's live

1. Open `https://YOUR-PROJECT.pages.dev/api/data`. You should see JSON containing `"demo":false`.
   - `"demo":true`: the variables are missing, or you didn't redeploy after adding them.
   - An error: see *Troubleshooting* below.
2. Open the site on your phone. The yellow **DEMO DATA** banner should be gone and the schedule should match the sheet.
3. Live test:
   - In the sheet, set tonight's first match Status to **Live**. Within about a minute a red dot appears on the **Schedule** tab, and the match shows as Live there.
   - Set it back to **Scheduled**.
4. Optional: on the phone's browser, use **Add to Home Screen** and the app opens like an installed app.
5. Share the link, or a QR code of it, with the hostel.

## Updating later

- **Results, schedule, DON, adjustments:** edit the Google Sheet only. No redeploy is needed.
- **Code changes:** push to GitHub, and Cloudflare redeploys automatically in about a minute.
- **How fresh the app is:** usually within 30–60 seconds of an edit.
  - Cloudflare keeps a copy for 20 seconds.
  - Phones re-check every 30 seconds, and immediately when the app is reopened.
  - Unchanged data costs only a tiny "not modified" reply.
- **Free-plan headroom:** page files are free and unlimited. Data checks count against 100,000 free requests per day, which resets daily; expect roughly 25,000 a day.

## Troubleshooting

| What you see | Fix |
|---|---|
| `/api/data` shows `"demo":true` | Variables are missing or misspelled → fix them in **Settings → Variables and Secrets**, then **Retry deployment**. |
| App says "Couldn't load the tournament data" and the function log shows `403` | The sheet isn't shared as "Anyone with the link → Viewer", or the Sheets API isn't enabled for the key's project. |
| Function log shows `400` / `404` | Wrong `GOOGLE_SHEET_ID`. Check that you used the converted Google Sheet, not the `.xlsx`. |
| Banner says "The score sheet can't be reached right now" | Google had a temporary problem. The app keeps showing the last good data and recovers by itself. |
| Times are off by 5½ hours | The sheet's time zone isn't IST → **File → Settings**. |
| Something in the sheet broke | **File → Version history → See version history**. Restore the last good version. |

Function logs: **your project → Deployments → View details** on the latest deployment **→ Functions → Begin log stream**, then load `/api/data` in another tab.

## Alternative: Netlify

The code also still runs on Netlify (`netlify.toml` and `netlify/functions/`). Import the repo at app.netlify.com, add the same two variables under **Site configuration → Environment variables**, and redeploy. Mind the free plan's monthly credit limit.
