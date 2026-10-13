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

You can do all of this from the **Google Sheets mobile app**.

## During a match (MATCHES tab)

Find the match row; the Date, Event and Stage columns help.

| When | Do this |
|---|---|
| Match starts | **Status** → `Live`. The app shows it under "Live now" with a red dot. |
| During play (optional) | Type the running score in **Score**, e.g. `1-0`, `Q3: G 31 - 27 H`, `S 64/3 (8 ov)`. |
| Match ends | 1. **Score** → final score, e.g. `2-1`, `24-18`, `1-1 (4-3 pens)`. <br>2. **Winner / 1st** → the winning house. <br>3. **Status** → `Completed`. |
| No-show (rulebook: 15 minutes late = bye) | **Winner / 1st** → the team that turned up. **Status** → `Walkover`. **Notes** → e.g. `Hufflepuff did not show up`. |
| Delayed or rescheduled | **Status** → `Postponed`. Once the new time is known, update **Date / Start / End** and set **Status** back to `Scheduled`. |
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

### Times after midnight
- Keep the **Date** as the *evening* the session belongs to, as in the printed schedule. For example, the FIFA final at 00:30 after the 15 Oct evening has Date = **15 Oct**, Start = **00:30**.
- Anything before **05:00** counts as the previous evening. 06:00 Cricket is the morning of its own date.

### Adding a new match or hostel event
- Use any empty row below the last one; the app sorts by date and time.
- Fill in: Match ID (unique, e.g. `M59`), Date, Start, End, Type, and either **Event + Stage + teams** (sport) or **Title** (non-sport, e.g. "Litfest").
- For non-sport events set **Type** = `Event`. They appear in the schedule as event cards with no score.

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

## Fixing mistakes

- Just correct the cell. Every total, bracket and the app recalculate.
- Wrong winner on a semifinal? Fix it and the final's teams update too. Check whether anyone already entered the final's result.
- Something badly broken? **File → Version history → See version history** and restore an earlier version.

## Where to look

| Tab | Use it for |
|---|---|
| **TODAY** | Tonight's matches in order. Type a date in `F3` to look at another night; clear it to go back. |
| **DASHBOARD** | Leader, live matches, next match, data problems, DON summary. |
| **LEADERBOARD** | Totals with the breakdown: event points, DON, Weasley, adjustments, 1st/2nd counts. |
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
