# SCAM guide: updating the GOF 2026 sheet

The app reads the Google Sheet. **Whatever you type appears on students' phones within about a minute**, so double-check before you press Enter.

## Golden rules

1. **Type only in yellow cells.** Grey cells are formulas. Never type over them, and never delete them.
2. **Use the dropdowns** for houses, events, stages and status. Don't type house names by hand.
3. **Points count only when Status is `Completed` or `Walkover`** *and* a winner is chosen.
4. Don't sort, insert columns, rename tabs or change header text in MATCHES. The app finds tables by their headers.
5. The **Check** column (MATCHES, column AG) turns **red** when something's wrong. Keep **DASHBOARD → "Data problems in MATCHES"** at **0**.
6. Everything in **Score**, **Notes** and adjustment **Reason** is **public** in the app.
7. Agree who is the scorer for each match, so two people don't edit the same row at once.
8. **Dates and times live in the SCHEDULE grid**, not in MATCHES (see below).

You can do all of this from the **Google Sheets mobile app**.

## Changing the schedule (SCHEDULE tab)

The **SCHEDULE** tab is the timetable grid. **It is the only place to change dates and times.** A small script copies every change into MATCHES automatically, usually within a minute. You'll see a "GOF schedule sync" message in the corner. The app updates about a minute after that.

| To… | Do this in the SCHEDULE grid |
|---|---|
| Move a match | Click its cell, grab the cell's **border** and **drag** it to the new day and time. On a phone, use **Cut** then **Paste**. |
| Make a match longer or shorter | Merge it with the next empty cell (**Format → Merge cells**), or unmerge it. |
| Add a match | Type it in an empty cell, e.g. `Dodgeball (S v H)` |
| Remove a match from the schedule | Delete the cell's text. The app shows it as "Not scheduled". |
| Add a hostel event | Type its name, e.g. `Verve`, and merge across the evening. An empty merged, coloured row is shown as "To be announced". |

**How to write sport cells** (the same style the grid already uses):
- **Semi-final:** sport, then the two house letters, e.g. `Football M (G v S)`, `Volleyball W (R v H)`, `TT (G v S)`
- **Final:** add the word `Finals`, e.g. `Basketball W Finals`
- **All houses together:** e.g. `BGMI (All)`, `Poker (All)`, `Athletics (Relay) M`, `Athletics (Shotput) W`
- **Anything else** becomes an event card with no score.

Rules worth knowing:
- **Times:** a cell's start time is its column. A merged cell ends where the next column starts. A cell across the whole row has no times ("All evening"). Cells in the after-midnight columns stay on the evening's row.
- **If a cell can't be understood** (a typo, an unknown house letter, or a semi-final without its teams), nothing is guessed. The sync message says how many problems it found, and the **SYNC_LOG** tab names the cell, e.g. `H5: Unknown sport in "Pickelball (G v S)"`.
- **Results are never touched.** Moving a match only changes its date and time. A match that already has a result keeps its date even if you delete its cell.
- **Forcing a sync:** if the app hasn't updated after a couple of minutes, use the menu **GOF → Sync schedule now**.

## During a match (MATCHES tab)

Find the match row; the Date, Event and Stage columns help.

| When | Do this |
|---|---|
| Match starts | **Status** → `Live`. The app shows it under "Live now" with a red dot. |
| During play (optional) | Type the running score in **Score**, e.g. `1-0`, `Q3: G 31 - 27 H`, `S 64/3 (8 ov)`. |
| Match ends | 1. **Score** → final score, e.g. `2-1`, `24-18`, `1-1 (4-3 pens)`. <br>2. **Winner / 1st** → the winning house. <br>3. **Status** → `Completed`. |
| No-show (rulebook: 15 minutes late = bye) | **Winner / 1st** → the team that turned up. **Status** → `Walkover`. **Notes** → e.g. `Hufflepuff did not show up`. |
| Delayed or rescheduled | **Status** → `Postponed`. Once the new time is known, move the cell in the **SCHEDULE** grid and set **Status** back to `Scheduled`. |
| Cancelled | **Status** → `Cancelled`. |

### Finals fill themselves in
Leave **Team 1 / Team 2 empty on Final rows.** When both semifinals are `Completed` (or `Walkover`) with a winner, the final's teams appear automatically in MATCHES, BRACKETS and the app.

### Single-round events (Poker, BGMI, Relay M/W, Shot Put M/W)
All houses compete together. When the result is in:
1. **Winner / 1st** → the 1st-place house.
2. **2nd place** → the 2nd-place house.
3. **Status** → `Completed`.

You apply the rulebook's special cases when you choose the two houses:
- **BGMI:** two different houses must get 1st and 2nd, even if one house's squads finish top two.
- **Poker:** if the last two players standing are from the same house, 2nd place goes to the third-to-last player's house.

### Don't change Date / Start / End in MATCHES
Those columns, and the Event rows, are filled from the SCHEDULE grid and are overwritten on every sync. Change the grid instead.

## Double or Nothing (DON tab) — on declaration day

For each house:
1. Pick its event in **DON event**. The dropdown lists only allowed events: no E-Sports or Athletics.
2. Enter the **Declared on** time.
3. Check that **Result** doesn't say `INVALID`. For example, Ravenclaw can't pick *Football Men*, its Weasley Challenge sport.
4. Once all picks are in, ask the sheet admin to protect the DON event cells (`B4:C7`).

The sheet then handles DON by itself:
- **1st place:** doubled.
- **2nd place:** 0.
- **Lost a semifinal, or not in the top two:** −100, applied **immediately**.

## Weasley Challenge

These are already set up, so there's nothing to do. Ravenclaw challenged Slytherin in Football Men, and Gryffindor challenged Slytherin in FIFA. Only the challenger gains +50 or loses −50 when that semifinal is completed.

## Bonus or penalty points (ADJUSTMENTS tab)

Add one row per decision:
- **Date**
- **House**
- **Points**: use a negative number for a penalty, e.g. `-50`
- **Reason**: shown publicly in the app
- **Approved by**

Leave rows you don't need empty. To cancel an adjustment, delete its row's contents.

**Points that belong to one event:** start the Reason with the event name exactly as in SETUP, then a colon, e.g. `BGMI: joint 2nd with Hufflepuff (50 pts split)`. The app then shows the points in that event's row of the Points Table and in the house breakdown, instead of under "SCAM adjustments". Totals are the same either way.

**Tie for 2nd place in a single-round event** (e.g. BGMI, 15 Oct: Slytherin and Hufflepuff tied):
1. In MATCHES, enter the **Winner / 1st** and leave **2nd place** blank. The row's Check will keep asking for a 2nd place; that's expected for a tie.
2. In ADJUSTMENTS, add one row per tied house with its share of the 2nd-place points:

   | Date | House | Points | Reason |
   |---|---|---|---|
   | 15-Oct-2026 | Slytherin | 25 | BGMI: joint 2nd with Hufflepuff (50 pts split) |
   | 15-Oct-2026 | Hufflepuff | 25 | BGMI: joint 2nd with Slytherin (50 pts split) |

The app then shows both houses as 🥈 joint 2nd on the match card and the sport page. A shared 2nd entered this way does **not** count as a "2nd place" in the leaderboard tiebreak.

## Cancelling a whole sport

To drop a sport from the tournament (for example Lawn Tennis, cancelled on 28 Oct):
1. Remove its cells from the SCHEDULE grid. The sync then clears its dates.
2. In MATCHES, set **Status** to **Cancelled** on **every** row of that sport (semis and final).

Within about a minute the sport disappears from the app: no card on the Sports page, no row in the Points Table, no bracket. Leave its row in SETUP alone, because deleting it would shift the formulas. If even one of its rows isn't "Cancelled", the sport still shows.

## Fixing mistakes

- Just correct the cell. Every total, bracket and the app recalculate.
- Wrong winner on a semifinal? Fix it and the final's teams update too. Check whether anyone already entered the final's result.
- Something badly broken? **File → Version history → See version history** and restore an earlier version.

## Where to look

| Tab | Use it for |
|---|---|
| **TODAY** | Tonight's matches in order. Type a date in `F3` to look at another night; clear it to go back. |
| **DASHBOARD** | Leader, live matches, next match, data problems, DON summary. |
| **LEADERBOARD** | Totals with the breakdown: event points, DON, Weasley, adjustments, 1st/2nd counts. ⚠️ The website also gives semi-final winners their 2nd-place points before the final (except a house in its own DON sport), so its totals can be higher than this tab until the final is played. Nothing to enter: just record the semi result as usual. |
| **BRACKETS** | Every event's semis, final, champion and runner-up. |
| **POINTS_LOG** | Points per event per house: place, base points, DON effect. |

## What students see

| App page | Shows |
|---|---|
| **Opening screen** | The GOF logo and house banners for about 2 seconds while the data loads. Tapping skips it. |
| **Standings** | House pennants with their hostels (tap one for a breakdown), the sport × house points table (DON picks highlighted), and the latest results |
| **Schedule** | Any day of the tournament, including live scores. A red dot on the tab means a match is live. |
| **Sports** | Each event's bracket or podium, DON/Weasley stakes, and points |
| **DON** | Each house's pick and outcome, Weasley Challenges, SCAM adjustments |
