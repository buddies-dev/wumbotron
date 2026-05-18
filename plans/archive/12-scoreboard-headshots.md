# 12 — Scoreboard headshots

## Goal

Make player headshots the dominant element on `/display/[matchId]`, with the score as a secondary read. Fix the current broken render (parent height 0 → `<Image fill>` warns and shows nothing) and rework the panel hierarchy so the headshot — not the score — is the focal point.

All work is in `src/components/display/Scoreboard.tsx`. `next.config.ts` already allowlists `upload.wikimedia.org`; no further config changes.

## Scope

**In:**
- Fix headshot render: explicit width + height on the headshot wrapper so `<Image fill>` has a measurable parent
- Strip tracking query params from the placeholder URL
- Re-balance `<PlayerPanel>` so headshot is the visual hero, name is a caption on the headshot, score is a smaller secondary element
- Drop redundant `priority` on one of the two headshots to silence the multi-LCP warning
- Verify right-panel score still sits flush to the outer edge after the flex-column refactor

**Out:**
- Real per-player headshot URLs / upload flow (data-model work — separate plan)
- Headshot in the `<WinnerView>` celebration (could be a follow-up; keep current layout)
- Headshots in the bracket display cells (separate concern)
- Animations on headshot mount/swap

## Layout

Headshot occupies the upper ~⅔ of each panel with the player name overlaid as a lower-third caption. Score sits beneath the headshot at a reduced size. "Up next" indicator stays as the bottom row.

```
┌──────────────────┐    ┌──────────────────┐
│                  │    │                  │
│                  │    │                  │
│    HEADSHOT      │ vs │    HEADSHOT      │
│                  │    │                  │
│ ░░NAME LOWER░░░░ │    │ ░░NAME LOWER░░░░ │
└──────────────────┘    └──────────────────┘
       14                       11
   Up next
```

Right-panel mirrors: headshot aligned to outer (right) edge, name caption right-aligned, score right-aligned, "Up next" right-aligned. The existing accent border (`border-l-[0.8vmin]` / `border-r-[0.8vmin]`) stays on the outer edge of the panel as the up-next indicator.

## Concrete steps

1. **Fix the headshot wrapper sizing** (root-cause the 0-height warning)
   - In `HeadshotSlot` (`Scoreboard.tsx:272-304`), replace `aspect-[4/5] w-[min(26vw,44vmin)]` with explicit width *and* height: `w-[min(38vw,60vmin)] h-[min(47.5vw,75vmin)]` (4:5 ratio, sized up to make the headshot the hero).
   - Reason: Tailwind v4 arbitrary values containing `min(…, …)` can fail to emit, and even when the width rule lands, `aspect-ratio` on a flex-column child is not reliably measurable by `<Image fill>` at mount. Explicit `w-…/h-…` sidesteps both.
   - Keep `relative overflow-hidden rounded-md border bg-zinc-100`. Drop `max-w-full` (no longer needed once both axes are explicit).

2. **Clean up the placeholder URL**
   - `HEADSHOT_PLACEHOLDER_SRC` (`Scoreboard.tsx:27-28`) → drop the `?utm_*` querystring. Final: `https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png`.
   - **Why:** the query params do nothing on Wikimedia upload paths and only bloat the `/_next/image` cache key.

3. **Restructure `<PlayerPanel>` so the headshot is the focal point**
   - Current (`Scoreboard.tsx:234-269`): headshot → name (FitText, big) → score (huge) → up-next. Score dominates.
   - New stack inside the existing `<article>`:
     1. `<HeadshotSlot>` with name overlaid as a lower-third caption (see step 4) — no separate `FitText` name above
     2. Score row beneath the headshot, smaller: `text-[clamp(4rem,8vw,12rem)]` instead of the current `clamp(7rem,15vw,20rem)`
     3. "Up next" row unchanged
   - Keep `flex flex-col` on the article, keep `text-left`/`text-right` per side, keep the outer accent border on the up-next side.

4. **Name as a lower-third caption on the headshot**
   - Inside `HeadshotSlot`, after the `<Image>`, add an absolutely-positioned caption: `absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-[1.5vmin] py-[1.2vmin]`.
   - Caption contains a `<FitText className="h-[5vmin] w-full font-black" minFontSize={16} maxFontSize={56}>{name}</FitText>` with `text-left`/`text-right` matching the panel `align`.
   - Remove the old standalone `<FitText>` name from `<PlayerPanel>`.

5. **Silence the multi-LCP `priority` warning**
   - `<Image priority>` (`Scoreboard.tsx:298`) is meant for a single above-the-fold LCP image. With two panels, Next preloads both and warns.
   - Keep `priority` on the left panel only, or drop it entirely and use `loading="eager"` on both. Pick one: prefer `loading="eager" fetchPriority="high"` on both — semantically correct, no warning.

6. **Right-panel alignment verification**
   - The flex-column refactor changed how the score block sits. After step 3, confirm the score on the right panel is flush to the right edge:
     - Score wrapper needs `text-right` (inherits from article via `text-right` on the panel — verify nothing inside the new score row overrides it).
     - Name caption inside the right headshot needs `text-right` on the `FitText`.
   - Eyeball at 1080p and 4K viewports.

7. **Visual QA**
   - `pnpm dev`, open `/display/[matchId]` for an in-progress match.
   - Verify: headshot visible (no 0-height warning in browser console), headshot is clearly the largest element per panel, score reads as secondary, name overlays the bottom of each headshot, up-next accent border still glows on the active player.
   - Check `<WinnerView>` still renders normally on match completion (unchanged code path).

## Exit criteria

- Browser console shows no `<Image>` height/priority warnings on `/display/[matchId]`.
- Headshot is visibly the dominant element in each `<PlayerPanel>` at 1080p; score reads as secondary.
- Name renders legibly on top of the headshot's lower-third gradient on both panels.
- Right-panel score and name stay flush to the right edge.
- `<WinnerView>` celebration on match completion is unaffected.

## Notes

- This plan uses a single hard-coded Wikimedia placeholder for *both* players. Real per-player headshots need a `player.headshot_url` column (or a `player` table — current schema embeds names directly on `match`). Defer to a follow-up plan when the data model catches up.
- If step 1's explicit sizing still doesn't render, the next thing to suspect is the parent grid row collapsing — the `<section>` containing the panels uses `min-h-0 flex-1`, which can starve children if the surrounding flex column doesn't have a definite height. Unlikely given the rest of the layout works, but worth checking before adding more CSS.
- Don't introduce a generic `<Avatar>` component yet. One usage site, no second consumer in sight.
