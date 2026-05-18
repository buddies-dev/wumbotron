# 11 — Bracket display polish

## Goal

Make `/display/tournament/[tournamentId]` read as a real broadcast bracket: proper elbow connectors between rounds, contained cell styling so winner highlights don't bleed past the card, and a two-sided (left/right meeting at center) layout by default.

All work is in `src/components/display/Bracket.tsx` and its loader output `src/lib/bracket/load-display-tournament.ts`. No schema or realtime changes.

## Scope

**In:**
- SVG elbow connectors joining each pair of round-N cells to their round-(N+1) parent
- Fix winner-highlight overflow on `<BracketCell>` (clip to card, contained padding)
- Two-sided layout: left half advances rightward, right half advances leftward, final sits in the middle column
- Champion view inset (`ChampionView` reuses `<Bracket>`) keeps working with the new layout

**Out:**
- Connector animations on advance (could be a follow-up; static lines first)
- Bracket formats beyond single-elim
- Reseating/reseeding UI (control surface)
- Odd-bracket-size handling beyond what `single-elim.ts` already produces (byes)

## Layout

Two-sided single-elim. For a bracket with N rounds, left side holds rounds `1..N-1` of the top half advancing rightward; right side mirrors with the bottom half advancing leftward; the final round sits in a centered column between them.

```
Round 1   Round 2          Final          Round 2   Round 1
A 15 ─┐                                            ┌─ 15 E
       ├─ A 15 ─┐                          ┌─ 15 E ┤
B  9 ─┘         │                          │       └─  9 F
                ├──── A 15  vs  15 E ──────┤
C  ? ─┐         │                          │       ┌─  ? G
       ├─ ?     ┘                          └─ ?    ┤
D  ? ─┘                                            └─  ? H
```

For brackets with a single round (1 match, 2 players) fall back to the existing single-column layout. For 2-round brackets, left side = match 1, right side = match 2, final in the middle. Pair assignment: matches at `position` `0..⌈count/2⌉-1` per round go left; the rest go right, rendered with reversed order so seeds align toward the outside edges.

## Concrete steps

1. **Split rounds into sides (pure helper)**
   - In `Bracket.tsx`, replace `groupByRound` with `splitBracketSides(matches)` returning `{ left: Round[], right: Round[], final: Match | null }`.
   - `left[i]` and `right[i]` are the two halves of round `i+1`; `final` is the single match in the last round (null if N=1, handled separately).
   - Sort `right` rounds so the innermost round is closest to center (reverse column order when rendering).

2. **Container grid**
   - Outer `<section>` becomes `grid-template-columns: repeat(${N-1}, 1fr) auto repeat(${N-1}, 1fr)` for N≥2; the center `auto` column holds the final.
   - Each side keeps the existing per-round flex column with `justify-around`, so vertical pair centering is preserved.
   - Round headers mirror: left side reads "R1 → Semifinal" left-to-right, right side reads "Semifinal ← R1" right-to-left. Use the same `roundName(round, totalRounds)` helper.
   - For N=1 keep the current single-column rendering; skip the connector overlay entirely.

3. **Card styling fix**
   - On `<BracketCell>`: add `overflow-hidden` to the `<article>` so the winner row's `bg-emerald-300/15` cannot extend past the rounded border (currently `rounded-md` on the article but inner `rounded-sm` rows + slight padding mismatch lets the highlight render outside the visual card edge, especially on the right edge where `hasConnector` adds an absolute stub at `left-full`).
   - Move the connector stub out of `<BracketCell>` — it becomes part of step 4's SVG layer, not a per-card absolute element. This removes the `left-full` overflow source.
   - Tighten inner padding so the row backgrounds sit flush to the card's inner edge: `p-[1.4vmin]` on `<article>` with `gap-[0.7vmin]` rows is fine; drop the `px-[0.8vmin]` on `<PlayerLine>` and rely on the article's padding so winner row spans the full inner width without sub-pixel gaps.

4. **SVG elbow overlay**
   - Add a single absolutely-positioned `<svg>` child inside the bracket `<section>` with `position: absolute; inset: 0; pointer-events: none;` and `preserveAspectRatio="none"` is **not** suitable — keep 1:1 pixel mapping. Use a `ResizeObserver`-backed effect (`useLayoutEffect`) that measures the rendered card rects via `data-bracket-cell={id}` refs and computes elbow paths in pixel coordinates.
   - For each non-final round `i`, for each pair `(a, b)` of adjacent cells advancing to parent `p`:
     - Left side: path goes from `a.right midY` → horizontal to gutter midpoint → vertical to `p.left midY` → horizontal into `p.left`. Same for `b`. Standard bracket elbow.
     - Right side: mirror horizontally (start at cell's `left` edge, run leftward).
   - Stroke: `1.5px` `rgba(255,255,255,0.25)` baseline; switch to `var(--accent)` for any segment where the source cell is `complete` and feeds the active match, or where the segment is part of the active match's ancestry. Reuse `data.activeBracketMatchId` to compute the highlighted ancestry path on the client.
   - Re-measure on `ResizeObserver` of the `<section>` (TV resize, font-fit reflow) and on `data.matches` changes.

5. **Champion view**
   - `ChampionView` already passes `data` to a recursive `<Bracket>` for the inset. Confirm the two-sided layout still reads at the reduced `0.8fr` column width; if it crowds, gate the inset on `rounds.length <= 3` and fall back to a compact list otherwise. (Decide during implementation; don't pre-build the fallback.)

6. **Visual QA**
   - Seed 4-, 8-, and 16-player tournaments via `pnpm seed:match` flow (or hand-seed in Studio). Verify:
     - Connectors land on cell vertical midpoints at every round
     - No highlight bleed past card edges, including the right edge of left-side cells
     - Final sits centered, with both sides' semis feeding into it symmetrically
     - Active-match accent propagates along the correct ancestry only

## Exit criteria

- `/display/tournament/[tournamentId]` renders an 8-player bracket as two mirrored sides with the final centered, on a 1080p and a 4K TV viewport.
- SVG elbows visibly connect every pair to its parent across all rounds; no per-cell stub remains.
- Winner row background is fully contained within the card border at all rounds and on both sides.
- Champion view still renders without layout break when the tournament completes.
- No regressions in realtime update behavior (advancing a match still re-renders connectors and highlights without a manual refresh).

## Notes

- The connector overlay is the first piece of measurement-driven rendering in `display/`. Keep the measurement code local to `Bracket.tsx`; don't generalize it until a second component needs it.
- `data-bracket-cell` attributes are the contract between layout and overlay — if you rename them, grep the overlay code.
- Two-sided layout assumes the bracket-build order in `src/lib/bracket/single-elim.ts` produces stable `position` values where the top half is the lower indices. Verify before relying on it; if not, sort explicitly in `splitBracketSides`.
