# 01 — Match data model

## Goal

Persist a single shoveltoss match in Supabase. Schema is sufficient to fully reconstruct match state (scores, phase, whose turn) from the toss log alone.

## Scope

**In:**
- `match`, `inning`, `toss` tables
- RLS policies (permissive read, owner-only write — owner = anon for MVP)
- A pure derivation module that takes a match + ordered tosses and returns scores + phase
- Seed/test data for a sample match

**Out:**
- Tournaments, brackets, players-as-rows (names stay inline on `match` for now)
- Auth (owner-only writes will be a placeholder policy until auth lands)
- Real-time channels (plan 05)

## Schema

```sql
match (
  id              uuid pk default gen_random_uuid(),
  player1_name    text not null,
  player2_name    text not null,
  first_tosser    smallint not null check (first_tosser in (1, 2)),
  status          text not null default 'active' check (status in ('active', 'complete')),
  winner_slot     smallint check (winner_slot in (1, 2)),
  created_at      timestamptz not null default now()
)

inning (
  id              uuid pk default gen_random_uuid(),
  match_id        uuid not null references match(id) on delete cascade,
  number          int not null,
  phase           text not null default 'regulation'
                  check (phase in ('regulation','redemption','overtime','sudden_death')),
  unique (match_id, number)
)

toss (
  id              uuid pk default gen_random_uuid(),
  inning_id       uuid not null references inning(id) on delete cascade,
  player_slot     smallint not null check (player_slot in (1, 2)),
  value           smallint not null check (value in (-2, 0, 1, 2, 3)),
  order_in_inning smallint not null,
  created_at      timestamptz not null default now()
)
```

Indexes: `toss(inning_id, order_in_inning)`, `inning(match_id, number)`.

## Derivation rules (pure function)

Given a match and ordered tosses, compute:

- `p1_score`, `p2_score` — sum of tosses with **going-over wrap**: if total > 15, replace with `15 - (total - 15)`. Apply after each toss.
- `current_phase` — `regulation` until one player hits exactly 15 → `redemption`; both at 15 after redemption → `overtime`; tied after 3 OT throws each → `sudden_death`.
- `next_to_toss` — derived from inning order + tosses already in inning + phase.
- `is_complete`, `winner_slot`.

This logic lives in `src/lib/match/state.ts` as a pure function. Same module powers both display and control.

## Concrete steps

1. Write SQL migration via Supabase MCP `apply_migration` (tables + indexes + RLS).
2. RLS: enable on all three; policies allow `select` to anon; `insert/update/delete` to anon (placeholder — tighten when auth lands). Document this is intentional for MVP.
3. Generate TS types: `mcp__plugin_supabase_supabase__generate_typescript_types` → `src/lib/supabase/types.ts`.
4. Implement `src/lib/match/state.ts` with the derivation function + unit tests covering: regulation, going-over, redemption (both players hit 15), overtime, sudden death, ties.
5. Add a seed script (`scripts/seed-match.ts`) that inserts one example match with a partial toss log for manual testing.

## Exit criteria

- Migration applied; `list_tables` shows the three tables.
- `state.ts` tests pass for all five phases and the going-over rule.
- Seed script creates a queryable match; loading `/display/[seededId]` (still placeholder UI) confirms the id resolves to a real row server-side.

## Notes

- Storing `phase` on `inning` is convenient but technically redundant with the toss log. Keep it for query simplicity; the pure derivation is the source of truth and writes back to `phase` on toss insert.
- "Going over" applies **per toss**, not per inning total. The derivation must wrap after each toss.
- Player slots (1/2) are positional, not identity. Real player rows come in plan 06.
