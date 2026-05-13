# 02 — Display shell

## Goal

Establish the visual + structural primitives all display views (`/display/*`) sit inside: full-bleed, TV-safe, fluid typography that fills a 1080p or 4K screen without manual tuning.

## Scope

**In:**
- `app/display/layout.tsx` enforcing full-bleed dark layout, no scrollbars, no chrome
- Fluid typography utilities (clamp-based or vw-based) for huge type
- Safe-area inset (~4–5%) accounting for TV overscan
- A `<FitText>` component that scales text to fill its container
- A connection-state indicator (subscribed/disconnected/reconnecting) — visual only, wiring is plan 05
- Display theme: dark default, high contrast, generous spacing

**Out:**
- Any match-specific UI (plan 03)
- Realtime hookup (plan 05)
- Animations (plan 09)

## Concrete steps

1. **Display layout**
   - `src/app/display/layout.tsx`: `<html>`/`<body>` already in root; this layout sets `min-h-screen`, hides overflow, sets safe-area padding, dark bg.
   - Hide cursor after a few seconds of inactivity (CSS-only, optional).

2. **Typography scale**
   - Define a scale in `tailwind.config.ts` using `clamp()` so text scales with viewport: e.g. `text-display` = `clamp(8rem, 18vw, 24rem)`.
   - Body font: a clean sans (Inter or system). Display font: a heavier weight or a numeric-tabular font for scores.
   - `font-variant-numeric: tabular-nums` everywhere a score appears so digits don't jitter.

3. **`<FitText>` component**
   - `src/components/display/FitText.tsx` — measures container, binary-searches font size to fit. Used for player names of unknown length.
   - Resize-observer-driven, debounced.

4. **Connection indicator**
   - `src/components/display/ConnectionDot.tsx` — small dot in a corner inside the safe-area. Props: `status: 'live' | 'reconnecting' | 'offline'`. Plan 05 wires it; for now accept the prop.

5. **Safe area + overscan**
   - Tailwind utility `safe-tv` → padding 4vh / 4vw.
   - Display layout wraps content in `<div class="safe-tv">`.

6. **Demo route**
   - `/display/__demo` (or similar) renders the shell with placeholder large text + connection dot to eyeball on an actual TV. Remove or gate behind dev-only when shell is finalized.

## Exit criteria

- Visiting any `/display/*` route renders full-bleed, dark, no scrollbars.
- `<FitText>` keeps a long name on one line without overflow on a 1080p display.
- Demo route is readable from across a room on a real TV (or simulated by zooming a browser window to TV dimensions).

## Notes

- TV browsers vary wildly. Test in Chromium at minimum; AirPlay/Chromecast both serve the page from a regular browser, so this is usually fine.
- Avoid `vh` units alone — they break on TVs with weird aspect handling. Pair with `clamp()` and `vw`.
- Don't ship a logo/brand mark in this plan. Polish comes in plan 09.
