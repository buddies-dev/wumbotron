# 09 — Polish

## Goal

Make it feel like a real broadcast graphic, not a webpage. Animations on score change, a moment for sticks, a winner celebration, optional sounds, brand styling.

## Scope

**In:**
- Score-change animation (count-up or slot-machine flip)
- "Stick!" callout when a 3 is scored
- Phase-transition banners (redemption / OT / sudden death entry)
- Match winner moment (big name, brief celebration)
- Tournament champion moment (richer celebration; bracket flythrough optional)
- Connector lines in bracket display (was deferred from plan 07)
- Sound effects (optional, muted by default — see notes)
- Light theming support (color accent per tournament)

**Out:**
- Per-team logos / colors per player (would need uploads — deferred)
- Streaming/OBS scene packaging
- Replay or highlight reel

## Concrete steps

1. **Score animation**
   - Wrap the score numerals in a component that animates from previous to current value.
   - Use Framer Motion or a CSS counter trick. Stick to ~400ms; longer feels sluggish.

2. **Stick callout**
   - When `lastToss.value === 3`, briefly overlay "STICK!" + player name for ~1.5s.
   - Triggered by realtime event, not on initial load.

3. **Phase banners**
   - When `phase` transitions, slide in a banner from the top: "REDEMPTION SHOT — PLAYER ONE" / "OVERTIME" / "SUDDEN DEATH".
   - Auto-dismiss after ~3s.

4. **Winner moment (match)**
   - On `match.status = 'complete'`, hold the final score for 2s, then animate to the winner-centered layout.
   - In a tournament context, suggest advancing to the next featured match.

5. **Champion moment (tournament)**
   - On `tournament.status = 'complete'`, show full-bleed winner name, brief animation.
   - Optionally: bracket pan/zoom showing their path to the win.

6. **Bracket connectors**
   - Add SVG/CSS connector lines between bracket cells in plan 07's component.

7. **Sound (optional, off by default)**
   - One-shot sound on stick, on winner. Settings toggle on the control page.
   - Browsers block autoplay audio without user gesture — sound only works after user interaction on the display device. Document this; don't fight it.

8. **Theming**
   - `tournament.accent_color` (hex). Display uses it for highlights, active-match glow.
   - Default to a neutral accent if unset.

9. **Pass on visual polish**
   - Consistent spacing, line heights, weights
   - Final font choices (display + body)
   - Ensure all states (loading / offline / empty) look intentional

## Exit criteria

- Scoring on control surface produces a visible, satisfying response on the display.
- A full tournament run-through feels like a broadcast, not a CRUD app.
- No layout glitches across the standard states (regulation, redemption, OT, sudden death, complete, champion).

## Notes

- Polish creep is real. Set a hard time budget — when it expires, ship and capture remaining ideas as follow-ups.
- Don't add features here that weren't in earlier plans; if a "polish" item is really a feature, promote it to its own plan instead.
- Test on a real TV. Things that look fine on a laptop can look terrible at 10 feet.
