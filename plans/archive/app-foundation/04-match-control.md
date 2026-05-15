# 04 — Match control

## Goal

A phone-friendly control surface at `/control/[matchId]` that drives a real match: log tosses, advance innings, handle redemption / OT / sudden death, declare winner. After this plan, a referee can run a complete match end-to-end.

## Scope

**In:**
- Match creation flow (lightweight — names + first tosser via RPS outcome)
- Toss entry UI (the five values as big buttons)
- "Whose turn" guard so the right player is always being recorded
- Undo last toss
- Auto inning advancement after both players toss in regulation
- Phase transitions: regulation → redemption → overtime → sudden death → complete
- Mark winner

**Out:**
- Realtime push to display (plan 05) — control writes to DB; display will refresh manually until plan 05
- Editing arbitrary tosses (just undo from the end)
- Multi-referee concurrency

## State machine

Inputs: current derived state from `state.ts`. Control UI prompts only what's legal next.

- **regulation**: alternating tosses per inning; after both toss, inning increments.
  - If first tosser hits exactly 15 mid-inning → opponent still tosses this inning.
  - End of inning, one at 15, other < 15 → **redemption**.
  - End of inning, both at 15 → **overtime**.
- **redemption**: non-15 player tosses repeatedly. Hits 15 → overtime. Misses (0, -2, or non-15 result) → match ends, 15-player wins.
- **overtime**: 3 alternating throws each from first-to-15. Higher cumulative wins. Tie → **sudden death**.
- **sudden_death**: single alternating throws. First player to stick a 3 while opponent does not match → wins.

Encode this as a derivation `nextAction(state) → { player, prompt }` so the UI never asks the wrong thing.

## Concrete steps

1. **Create-match page** (`/control/new`)
   - Two name fields, "who tossed first?" selector (after RPS in real life)
   - Insert row, redirect to `/control/[id]`

2. **Toss entry UI** (`/control/[matchId]`)
   - Top: current state echo (scores, inning, phase, whose turn) — same derivation as display
   - Buttons: `3 stick`, `2 back wall`, `1 in garden`, `0 front wall`, `-2 outside`
   - Big tap targets, color-coded
   - On tap: insert `toss` row with computed `inning_id`, `player_slot`, `order_in_inning`; advance inning row if needed; flip `match.status`/`winner_slot` on terminal transitions

3. **Undo**
   - Single button that deletes the most recent toss (and rolls back inning/match status if the deletion crossed a boundary)
   - Safer than free editing

4. **Phase prompts**
   - When entering redemption: banner "PLAYER X gets a redemption shot"
   - OT entry: banner + "throw 1 of 3" counter
   - Sudden death: banner + throw counter

5. **Server actions (or route handlers)**
   - `recordToss(matchId, value)` — server-side, recomputes state, writes rows, returns new state. Keep client thin.
   - `undoLastToss(matchId)`
   - `createMatch({ p1, p2, firstTosser })`

6. **Mobile ergonomics**
   - Viewport meta, prevent double-tap zoom, large hit targets (min 64×64 dp).
   - No landscape lock; the layout should work in portrait.

## Exit criteria

- A full match can be entered start-to-finish on a phone, including a redemption scenario and an overtime scenario.
- Undo correctly rolls back across inning/phase boundaries.
- Display view (manually refreshed) reflects every state correctly.

## Notes

- Don't try to validate "RPS happened" — just trust the first-tosser selection.
- The state machine is the most failure-prone piece. Cover it in unit tests against the derivation; the UI should be a thin wrapper.
- Consider a "verbose log" debug panel during dev — list every toss with its computed effect.
