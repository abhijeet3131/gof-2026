# Limitations, known issues and future improvements

## Limitations (by design)

- **Not instant.** Updates usually reach phones within 30–60 seconds, and at most about 2 minutes. This keeps the free API quota safe however many students are watching.
- **The app is read-only.** All scoring happens in the Google Sheet, so scorers need the Sheets app or a browser plus internet.
- **The sheet is the source of truth.** Checks catch impossible entries, such as a winner who isn't playing, a missing 2nd place, or duplicate rows. They **can't catch a wrong-but-possible winner.**
- **"Anyone with the link can view"** is required for the API key. Anyone who gets the sheet link can view it, but not edit it. Everything in it is public in the app anyway, so keep private notes out of the sheet.
- **Protection must be set by hand.** Google Sheets doesn't keep protected ranges from an uploaded `.xlsx` (see DEPLOYMENT Part A, step 7).
- **The DON deadline isn't time-locked.** Protect the DON cells after declarations.
- **Fixed capacity:**
  - exactly **4 houses**;
  - up to **30 events** (21 used);
  - **200 rows** in MATCHES (58 used);
  - **100 adjustments**;
  - **4 Weasley challenges**.

  Going beyond these needs formula changes.
- **Schedule auto-sync:**
  - Changes reach the app in about 1–2 minutes in total: the sync, then the app's refresh.
  - The grid must keep its shape: a **Date** column, one row of times (21:30, 22:00 …) and one row per day.
  - Sport cells must follow the naming style in the SCAM guide; anything else becomes an event card.
  - Google limits free scripts to about 90 minutes of running time a day. One sync takes about a second, so this is far beyond what a busy day needs.
- **Time logic assumes IST.** Anything from 00:00 to 04:59 belongs to the previous evening. The cut-off can be changed in SETUP.
- **Scores are free text.** The app doesn't model sets, frames or overs; only the **Winner** affects points.
- **Rulebook special cases are applied by the scorer**, not by formulas: BGMI same-house squads, the Poker third-to-last rule, chess Armageddon, the cricket super over and penalty shoot-outs.
- **Shared rank** happens only if total points, 1st places and 2nd places are all equal.
- **Finalist points are added by the website, not the sheet.** Between a semi-final and its final, the app's totals and ranks include the finalist's 2nd-place points but the sheet's LEADERBOARD doesn't. They match again once the final result is entered. A house that put its DON on that sport gets nothing early, in either.
- **No notifications.** The app doesn't send push alerts.
- **Offline use** is limited. The last loaded data stays on the phone and is shown with an "Offline" label until the connection returns.

## Known issues / things to verify

- **Not yet tested inside Google Sheets itself.**
  - All formulas were tested by running the real workbook in an Excel-compatible formula engine (74 checks).
  - Only standard functions are used (SUMIFS, COUNTIFS, INDEX/MATCH, IFERROR, SUMPRODUCT).
  - Still, do the post-upload check in DEPLOYMENT Part A, step 4.
- **Schedule times were read from the draft schedule image**, using the start and end of each merged cell. Please check them in MATCHES, especially:
  - Cricket has no end time; the grid shows only the 06:00 slot.
  - Litfest on 24 Oct runs 21:30–00:30.
  - Full-day events have no times and show as "All evening".
- **The Volleyball Men's Oct 21 match is set to Hufflepuff v Ravenclaw**, as you confirmed. The draft image said S v G.
- **Venues** for Chess, Poker, BGMI and FIFA are "To be declared". Update them in SETUP (default venue) or per match (Venue override).
- **3 and 4 November** have nothing scheduled. They're treated as reserve days.
- In demo mode (no sheet connected) the app shows made-up results with a yellow **DEMO DATA** banner.

## Future improvements

1. **Faster score entry:** a small Google Form or Apps Script sidebar ("pick match → pick winner → submit") so scorers don't scroll through MATCHES on a phone.
2. **Near-instant updates:** an Apps Script `onEdit` trigger that tells the server to drop its cached copy when the sheet changes.
3. **Push notifications** when a match goes live or a final ends.
4. **Announcements banner** controlled from a SETUP cell, for example "Football final moved to 11:30 PM".
5. **House pages** with every result, DON journey and points timeline.
6. **Player-level stats**, such as top scorers and MVPs, if SCAM wants to track them.
7. **Archive mode:** after 4 Nov, freeze the final data as a static file so the site no longer depends on the sheet.
8. **QR code poster** for the hostel notice boards.
