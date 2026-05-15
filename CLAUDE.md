@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Next.js version

This repo uses **Next.js 16** with React 19. APIs differ meaningfully from older Next.js conventions (e.g. async `cookies()`, async route `params`). Before writing Next-specific code, consult `node_modules/next/dist/docs/01-app/` rather than relying on prior knowledge.

## Commands

- `pnpm dev` — run the Next.js dev server
- `pnpm build` / `pnpm start` — production build/serve
- `pnpm lint` — ESLint (`eslint-config-next` core-web-vitals + TS)
- `pnpm test` — Vitest (one-shot). Run a single file: `pnpm test src/lib/match/state.test.ts`. Filter by name: `pnpm test -- -t "redemption"`
- `pnpm seed:match` — seed a demo match into Supabase (requires `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in env)

Package manager is **pnpm** (see `pnpm-workspace.yaml`; `allowBuilds` whitelists esbuild only). Path alias `@/*` → `src/*`.

## Architecture

Wumbotron is a TV/projector-optimized scoreboard for the game "shoveltoss" (1v1, first-to-15, inning-based). Two surfaces share one app and one Supabase backend:

- **Display** (`/display/*`) — read-only, full-screen, huge type, runs on a TV.
- **Control** (`/control/*`) — phone/laptop UI for score entry and bracket management.

Mutations happen on Control, persist to Supabase, and Supabase Realtime pushes changes to Display.

### Source-of-truth: toss log → derived state

The match state machine is **pure and lives in `src/lib/match/state.ts`**. `deriveMatchState(match, tosses)` consumes an ordered list of toss records and computes scores, current phase (`regulation` → `redemption` | `overtime` → `sudden_death`), who tosses next, and completion. The Postgres `inning.phase` column is denormalized for query convenience; the toss-log derivation is authoritative — don't introduce a second source of truth.

Toss values: `3` stick, `2` back wall, `1` in garden, `0` front wall, `-2` outside. Scoring overshoots bounce back from 15 (e.g. 17→13). See `src/lib/match/constants.ts` and the rules summary in `plans/README.md`.

### Data model (Supabase / Postgres)

Migrations in `supabase/migrations/`:
- `match` / `inning` / `toss` — per-match state
- `tournament` / `bracket_match` — single-elim brackets that reference `match` rows
- Separate migrations enable Supabase Realtime publication on these tables

RLS is enabled but **MVP policies allow anon read AND write** on all tables — this is intentional until real auth ownership lands. Don't tighten policies without coordinating; do not assume authenticated users.

### Supabase clients

- `src/lib/supabase/client.ts` — `createBrowserClient` for use in Client Components
- `src/lib/supabase/server.ts` — `createServerClient` for RSC/route handlers; uses Next 16's async `cookies()`. The `setAll` cookie writer swallows errors so it can be used from Server Components (which can't set cookies); auth flows that need to write cookies belong in middleware/route handlers.
- `src/lib/supabase/types.ts` — generated `Database` type; both clients are typed against it

### Routes (App Router)

- `app/display/[matchId]` and `app/display/tournament/[tournamentId]` — display surfaces
- `app/control/new`, `app/control/[matchId]`, `app/control/tournament/{new,[tournamentId]}` — control surfaces
- `app/api/matches/[matchId]/display` and `app/api/tournaments/[tournamentId]/display` — JSON read endpoints feeding the Display loaders

### Display rendering

`src/components/display/` — `FitText` does fluid TV scaling; `LiveMatch` / `LiveTournament` subscribe to Realtime channels and re-render on toss/bracket changes; `ConnectionDot` surfaces realtime status. Loaders in `src/lib/match/load-display-match.ts` and `src/lib/bracket/load-display-tournament.ts` hydrate initial state for the live components.

## Plans

`plans/` contains the master plan and incremental slice plans. Each slice has Goal / Scope / Steps / Exit criteria. When a plan turns out wrong mid-flight, update the plan file rather than letting reality drift. Completed slices live in `plans/archive/app-foundation/`.

## Env

`.env.example` lists only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The seed script reads these as well (no separate service-role flow yet).
