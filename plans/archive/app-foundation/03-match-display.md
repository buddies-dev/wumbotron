# 03 — Match display

## Goal

Render a read-only shoveltoss scoreboard at `/display/[matchId]` driven by real Supabase data. No realtime yet — fetched once server-side.

## Scope

**In:**
- Server component that loads match + innings + tosses by id
- H2H scoreboard layout: two big columns, names + scores
- Inning indicator + current toss-up player highlight
- Phase badge (regulation / redemption / OT / sudden death)
- Winner state when match is complete
- Use derivation from `src/lib/match/state.ts` (plan 01) — never read score from a stored field

**Out:**
- Live updates (plan 05)
- Animations on score change (plan 09)
- Control affordances

## Layout sketch

```
┌──────────────────────────────────────────────────────────┐
│ Inning 7 · regulation                              ● live│
│                                                          │
│   PLAYER ONE              vs              PLAYER TWO     │
│       12                                       9         │
│   ▌ up next                                              │
│                                                          │
│   Last toss: PLAYER TWO · +2 (back wall)                 │
└──────────────────────────────────────────────────────────┘
```

When complete:

```
┌──────────────────────────────────────────────────────────┐
│                       WINNER                             │
│                    PLAYER ONE  15                        │
│                    PLAYER TWO  13                        │
└──────────────────────────────────────────────────────────┘
```

## Concrete steps

1. **Data fetch (server component)**
   - `src/app/display/[matchId]/page.tsx` — server-side load match, all innings, all tosses (ordered).
   - 404 / friendly error if not found.

2. **Derive view model**
   - Run `deriveMatchState(match, tosses)` → `{ p1Score, p2Score, phase, currentInning, nextToToss, lastToss, isComplete, winnerSlot }`.

3. **Scoreboard component**
   - `src/components/display/Scoreboard.tsx` — pure presentational, takes the derived state.
   - Uses `<FitText>` for names, large tabular-nums for scores.
   - Highlights `nextToToss` column with a side bar or glow.

4. **Phase + meta**
   - Top-of-screen strip: inning number, phase label, connection dot.
   - Bottom strip: last toss summary ("PLAYER TWO · +2 back wall").

5. **Winner view**
   - Conditional layout when `isComplete` — center the winner big, runner-up below.

6. **Empty/loading states**
   - Match exists but no tosses yet → show 0–0, inning 1, first tosser highlighted.

## Exit criteria

- Visiting `/display/[matchId]` for the seeded match (from plan 01) renders a real scoreboard with correct scores.
- Manually inserting a toss row in Supabase and refreshing shows updated scores.
- Marking the match complete with a winner shows the winner layout.

## Notes

- This page is pure SSR for now; refresh = update. Plan 05 makes it live.
- Toss-value labels ("stick", "back wall", "in garden", "front wall", "outside") should live in a shared constants file — both display and control read them.
