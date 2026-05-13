# 07 — Bracket display

## Goal

Render a live single-elimination bracket at `/display/tournament/[tournamentId]`. Each cell shows the matchup, current/final score, and highlights the active match. Auto-updates via realtime.

## Scope

**In:**
- Server-rendered initial bracket from `bracket_match` + `match` joins
- Client subscription to `bracket_match` and `match` changes for the tournament
- Bracket tree layout that scales to 4, 8, 16 players cleanly
- Active-match highlight
- Champion celebration when tournament completes

**Out:**
- Drag/drop or any edit affordances (plan 08)
- Per-match deep-link views from the bracket cell (could just be a thought — punt)
- Non-single-elim layouts

## Layout

Standard left-to-right elimination tree. Cells stacked in columns, columns spaced by round. Connector lines optional in v1 (skip if costly; whitespace alignment reads fine on TV).

```
Round 1     Round 2     Final
A  15  ─┐
B   9   ├─ A  15  ─┐
C   ?   │  D  12   │
D   ?  ─┘          ├─ A  15
E   ?   ┌─ ?       │  ?
F   ?   │  ?      ─┘
G   ?  ─┘
H   ?
```

## Concrete steps

1. **Data load (server)**
   - Fetch tournament, all players, all bracket_matches (with their underlying `match` if present), all tosses for in-progress matches.
   - Shape into a tree keyed by `(round, position)`.

2. **Bracket render**
   - `src/components/display/Bracket.tsx` — pure presentational.
   - Layout via CSS grid: columns = rounds, rows per column = 2^(totalRounds - round).
   - Each cell uses a shared `<BracketCell>` showing two name/score lines + state badge (pending / live / complete).

3. **Active-match highlight**
   - The display owner picks "featured match" via control (plan 08) — for now, auto-highlight the most-recently-updated active match. Mark with a subtle glow.

4. **Realtime**
   - Reuse the subscription pattern from plan 05, scoped by tournament:
     - `bracket_match` changes filtered by `tournament_id`
     - `match` changes for any `match.id` referenced by this tournament's bracket_matches
     - `toss` changes for those matches
   - On any event: refetch tournament slice + re-render.

5. **Champion screen**
   - When `tournament.status = 'complete'`, swap layout to a celebration view with winner name + final bracket as a smaller side element.

6. **Responsive scaling**
   - 4-player tournament should fill the screen at the same visual weight as 16. Use container queries or compute font-size from cell count.

## Exit criteria

- Seeded 8-player tournament renders correctly with byes handled.
- Completing a match via control surface (plan 08, or by hand in DB) advances winners visually without refresh.
- Final match completion triggers champion view.

## Notes

- Don't add a "match detail" overlay — for that, the display is meant to be switched to `/display/[matchId]`. Two view modes is fine; jamming them together isn't.
- 32-player brackets get cramped on TV. Cap MVP testing at 16; document the limit.
- Connector lines are a polish item (plan 09). Get layout right with whitespace first.
