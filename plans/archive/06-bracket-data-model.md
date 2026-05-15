# 06 — Tournament + bracket data model

## Goal

Schema for a single-elimination tournament made of shoveltoss matches. A `match` row can now belong to a `bracket_match` slot; bracket advancement is a pure function of completed matches.

## Scope

**In:**
- `tournament`, `player`, `bracket_match` tables
- `match.bracket_match_id` nullable FK
- Migration is additive — existing standalone matches keep working
- Pure bracket helpers: `generateSingleElim(players)`, `advanceWinner(bracketMatchId)`

**Out:**
- Double elimination, round robin (deferred)
- Seeding heuristics beyond user-supplied order
- Bracket display (plan 07) or control (plan 08)

## Schema

```sql
tournament (
  id          uuid pk default gen_random_uuid(),
  name        text not null,
  format      text not null default 'single_elim' check (format in ('single_elim')),
  status      text not null default 'active' check (status in ('active','complete')),
  created_at  timestamptz not null default now()
)

player (
  id              uuid pk default gen_random_uuid(),
  tournament_id   uuid not null references tournament(id) on delete cascade,
  name            text not null,
  seed            int not null,
  unique (tournament_id, seed)
)

bracket_match (
  id              uuid pk default gen_random_uuid(),
  tournament_id   uuid not null references tournament(id) on delete cascade,
  round           int not null,                       -- 1 = first round
  position        int not null,                       -- 0..(2^(rounds-round) - 1)
  player1_id      uuid references player(id),         -- null until upstream resolves
  player2_id      uuid references player(id),
  match_id        uuid references match(id),          -- created when both players present
  next_bracket_match_id uuid references bracket_match(id),
  next_slot       smallint check (next_slot in (1, 2)),
  winner_player_id uuid references player(id),
  unique (tournament_id, round, position)
)

-- additive change:
alter table match add column bracket_match_id uuid references bracket_match(id);
```

## Concrete steps

1. **Migration** — additive, doesn't touch standalone match flow.
2. **Generator** — `generateSingleElim(players)`:
   - Accepts ordered players, pads to next power of two with bye sentinels.
   - Emits round-1 `bracket_match` rows, then empty rows for subsequent rounds, with `next_bracket_match_id` + `next_slot` wired.
   - Byes resolve immediately — `winner_player_id` set, advancement triggered.
3. **Advancement** — `advanceWinner(bracketMatchId)`:
   - Reads bracket_match + linked match; if match complete, copies winner into next slot.
   - If both slots in the next bracket_match are filled, creates the underlying `match` row.
   - Idempotent — safe to call repeatedly.
4. **Hook into match completion** — when `match.status` flips to `complete`, if `bracket_match_id` is set, call `advanceWinner`. Implement as a Postgres trigger or as part of the server action that completes a match. Pick triggers if we want it to be bulletproof; pick server-action wiring if we want it observable.
5. **Tests** — covering: 4-player bracket no byes, 5-player bracket with byes, 8-player bracket end-to-end advancement.

## Exit criteria

- Migration applied, types regenerated.
- Calling `generateSingleElim(['A','B','C','D','E','F'])` produces a valid bracket with two byes; querying the rows shows the expected tree.
- Simulating match completions in tests advances winners correctly all the way to a champion.

## Notes

- Player names are now real rows; standalone-match flow still uses inline names. That's fine — the two paths coexist via the nullable FK.
- Don't pre-create round-N `match` rows; only create when both players are known. Saves cleanup if a tournament is restructured.
- Avoid storing redundant `winner_player_id` on `bracket_match` if it's derivable from the linked match; keep it only if it simplifies bye handling. Document the choice when implementing.
