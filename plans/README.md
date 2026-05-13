# Wumbotron — Master Plan

A TV/projector-optimized shoveltoss display app. Two surfaces, one app:

- **Display view** (`/display/*`) — read-only, full-screen, huge type, runs on a TV.
- **Control view** (`/control/*`) — phone/laptop, score entry and bracket management.

State persists in Supabase; Supabase Realtime pushes changes from control → display.

## Stack

- Next.js (App Router, TypeScript)
- Tailwind
- Supabase (Postgres, Realtime, Auth)
- Vercel for deploys

## Sport: Shoveltoss

- 1v1, first-to-15
- Inning-based: both players toss once per inning, in fixed order chosen by RPS winner
- Toss values: **3** (stick), **2** (back wall lean), **1** (in garden), **0** (front wall), **-2** (outside)
- Going over: overshoot bounces back from 15 (e.g. 17 → 13)
- Redemption: if first player hits exactly 15, opponent throws until they hit 15 or miss
- Overtime: both at 15 → 3 alternating throws each; tie → sudden death

These mechanics drive the data model and the control UI state machine.

## Plan order

Each plan is a self-contained slice that leaves the app in a working state.

| # | Plan | Outcome |
|---|---|---|
| 00 | [Init](00-init.md) | Deployable Next.js + Supabase skeleton on Vercel |
| 01 | [Match data model](01-match-data-model.md) | `match`, `inning`, `toss` tables + RLS |
| 02 | [Display shell](02-display-shell.md) | Full-screen layout primitives, TV-safe typography, fluid scaling |
| 03 | [Match display](03-match-display.md) | Read-only H2H scoreboard rendering a real match row |
| 04 | [Match control](04-match-control.md) | Toss entry, undo, inning tracking, redemption/OT state machine |
| 05 | [Realtime sync](05-realtime-sync.md) | Control surface mutations push to display via Supabase channels |
| 06 | [Tournament + bracket data model](06-bracket-data-model.md) | `tournament`, `bracket_match` schema for single-elim |
| 07 | [Bracket display](07-bracket-display.md) | Read-only bracket render with live match scores embedded |
| 08 | [Bracket control](08-bracket-control.md) | Create tournament, seed players, advance winners |
| 09 | [Polish](09-polish.md) | Score-change animations, winner moment, intro card, sounds (optional) |

## How to use these plans

- Each plan has: **Goal**, **Scope (in/out)**, **Concrete steps**, **Exit criteria**.
- Work one plan at a time. Don't pull future scope forward.
- When a plan's exit criteria are met, commit and move on.
- If a plan turns out wrong mid-flight, update the plan file rather than letting reality drift from it.

## Open questions (resolve as they come up)

- Auth: do non-owners need to view a display, or is everything public-by-link?
- Multiple concurrent matches per display, or one match at a time?
- Bracket formats beyond single-elim (double-elim, round-robin)?
- Persistence of historical matches — do we need a "past matches" view?
