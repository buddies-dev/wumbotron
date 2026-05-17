# 10 — Basic workflow

## Goal

Turn the landing page from a developer link dump into a real entry surface that gets an organizer from "open the app" to "running a match or tournament on a TV" without needing to know any URLs.

## Why now

The pieces are built (match data model, control, display, brackets, realtime) but the seams are exposed:

- The landing page is a flat list of seven shells/demos with no narrative.
- `/control/new` writes a match to `localStorage` and routes to `/control/{local-id}`, but `/control/[matchId]` only loads via `loadDisplayMatch` (Supabase + demo fixtures). The local-storage match is unreachable — the "create new match" path is broken end-to-end.
- After creating a tournament there is no way to find it again on next page load — no list, no recent items.
- Nothing links a control room to its matching display URL, so an organizer running a TV has to hand-edit the path.

## Scope

### In

- A single landing surface with a clear primary action and a small set of secondary actions.
- A working server-backed "new match" path (mirroring how "new tournament" already works).
- A recent / resume list so existing matches and tournaments are reachable.
- A "Open display" affordance inside each control room (copy link + visible URL; QR optional).
- Keeping the demo routes accessible but moved off the front door.

### Out

- Auth, accounts, ownership. RLS stays anon-write for MVP (`supabase/migrations/202605130001_match_data_model.sql`).
- Editing or deleting historical matches/tournaments.
- Search, filters, pagination — a flat "last N" list is enough.
- Visual/animation polish (that's plan 09).
- Any new bracket formats or scoring rules.

## Concrete steps

1. **Fix `/control/new` to persist server-side.**
   - Replace the `localStorage` write in `src/app/control/new/page.tsx` with a Supabase insert into `match` + a first `inning` row, mirroring the pattern in `scripts/seed-match.ts` and `src/lib/tournament/create.ts`.
   - Use the browser client from `src/lib/supabase/client.ts`.
   - On success, route to `/control/{real-uuid}` so `loadDisplayMatch` can find it.
   - Gate behind the same `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` check `NewTournamentForm` uses; surface the same inline error if envs are missing.
   - Delete the `STORAGE_PREFIX` / `DisplayMatchData` localStorage path. (If we ever want offline mode we revisit deliberately.)

2. **Add a recent-items loader.**
   - New `src/lib/workflow/list-recent.ts` exporting `loadRecentMatches(limit)` and `loadRecentTournaments(limit)`, each ordering by `created_at desc`, returning trimmed shapes (id, names, status, created_at).
   - Server-side, uses `src/lib/supabase/server.ts`.
   - Falls back to `[]` when Supabase envs are missing (matches the pattern in `loadDisplayMatch`).

3. **Rebuild the landing page.**
   - `src/app/page.tsx` becomes an `async` Server Component.
   - Layout: hero with two primary CTAs — "New match" → `/control/new`, "New tournament" → `/control/tournament/new`.
   - Two stacked sections below: "Recent matches" and "Recent tournaments", each rendering up to ~5 items linking to their control routes. Show player names + status (active/complete) for matches; tournament name + status for tournaments.
   - Empty-state copy for each list (e.g. "No matches yet. Start one above.").
   - A small footer link "Demos" → `/demos` (new route in step 5). No top-level demo cards on the landing page.

4. **Surface the display URL from control rooms.**
   - In `MatchControl` (`src/components/control/MatchControl.tsx`) and `TournamentControl` (`src/components/control/tournament/TournamentControl.tsx`), add a compact header strip with: the display URL as text, a "Copy link" button, and a small "Open display" link that opens `/display/{matchId}` or `/display/tournament/{tournamentId}` in a new tab.
   - Keep it visually quiet — this is operator chrome, not part of the play surface.
   - QR rendering is explicitly out of scope; revisit if organizers ask for it.

5. **Park the demos.**
   - New route `src/app/demos/page.tsx` containing the existing seven-card grid from today's `page.tsx` (move, don't duplicate).
   - Leave demo routes themselves (`/display/test`, `/display/shell-demo`, `/display/complete`, `/display/tournament/demo`, `/control/test`) untouched.

6. **Smoke test the loop.**
   - From `/`, click "New match", enter names, land on `/control/{uuid}` that loads from Supabase. Toss entries persist. Display at `/display/{uuid}` updates live (this exercises plan 05 realtime).
   - Return to `/` — the new match appears in "Recent matches".
   - Same loop for tournament.
   - Verify the missing-env path still renders the form with the existing inline error.

## Exit criteria

- Landing page shows two primary CTAs plus recent-items lists; no demo links above the fold.
- Creating a match from `/control/new` produces a Supabase row and a working control + display URL pair.
- An organizer can close the tab, reopen `/`, and resume their in-progress match or tournament from the recent list.
- Each control room shows the corresponding display URL with a working copy button.
- `/demos` keeps every previously-linked demo reachable.
- `pnpm lint` and `pnpm test` pass. No new test files required beyond existing coverage (state machine and bracket tests already cover the logic this plan reuses).

## Notes for the implementer

- Don't introduce a "local mode" abstraction layer just because the old `/control/new` had one. The repo's convention is: if Supabase envs are present, use Supabase; if not, fall back to demo fixtures. The localStorage branch was a half-step that ended up unreachable — delete it rather than generalize it.
- Recent-items lists are read paths only. Don't add owner filtering — RLS is anon-read/anon-write across the board today and that's intentional per the migration comment.
- Keep server/client split honest: landing page is RSC, control-room display-URL chrome is in the existing Client Components.
