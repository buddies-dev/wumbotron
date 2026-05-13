# 08 — Bracket control

## Goal

Create and run a single-elim tournament from the control surface: enter players, generate the bracket, open matches in `/control/[matchId]` from a bracket overview, watch advancement happen automatically.

## Scope

**In:**
- `/control/tournament/new` — name + player list, generate single-elim bracket
- `/control/tournament/[id]` — bracket overview with tap-to-open per match
- "Set as featured" toggle per match (drives display highlight from plan 07)
- Automatic advancement on match completion (uses plan 06 helper)
- Re-seed / edit player names while bracket is still pre-start (no matches played)

**Out:**
- Editing a bracket after matches have started (deferred — would need cascading rebuild logic)
- Reordering / re-seeding mid-tournament
- Multiple tournaments at once on the same display (the display picks one)

## Concrete steps

1. **Create tournament page**
   - Name field, dynamic list of player name inputs (add/remove rows)
   - Submit: insert `tournament`, insert `player` rows in order, call `generateSingleElim(players)` from plan 06
   - Redirect to `/control/tournament/[id]`

2. **Tournament overview page**
   - Compact bracket view (smaller version of plan 07's bracket)
   - Each cell tappable when match exists → opens `/control/[matchId]`
   - "Featured" star toggle per active match
   - Status summary header: X/Y matches complete

3. **Featured-match mechanism**
   - Add `tournament.featured_match_id` column (nullable FK to `match`).
   - Display in plan 07 reads this; if null, falls back to "most recent activity".
   - Control toggle writes to this field.

4. **Pre-start edits**
   - While no match has any tosses, allow renaming players (updates `player.name`) and reordering (updates `seed`, regenerates bracket).
   - Once any toss exists, lock player editing — show read-only.

5. **Advancement wiring**
   - Confirm plan 06's advancement triggers on `match.status = 'complete'`.
   - On match completion in `/control/[matchId]`, if the match has a `bracket_match_id`, show a "back to tournament" CTA.

6. **Delete / abandon**
   - Soft "abandon tournament" action (sets status, doesn't delete). Hard delete only from DB for now.

## Exit criteria

- Create an 8-player tournament from the control surface in under 60 seconds.
- Play through every match — winners advance automatically, champion view appears.
- Featured-match toggle controls which match the display highlights.
- Pre-start name edits work; post-toss edits are locked.

## Notes

- Player slots in `match` (player1_name / player2_name) should be populated from `player.name` at match-creation time inside `advanceWinner`. Don't try to keep them in sync afterward — they're a snapshot.
- The compact bracket on the control page can share a component with plan 07's display bracket if styled with a "size" prop. Don't fork it.
- Hard scope cut: no double-elim, no consolation bracket. Single tree, single champion.
