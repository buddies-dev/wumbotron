create table public.tournament (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  format text not null default 'single_elim' check (format in ('single_elim')),
  status text not null default 'active' check (status in ('active', 'complete')),
  created_at timestamptz not null default now()
);

create table public.player (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournament(id) on delete cascade,
  name text not null,
  seed int not null,
  unique (tournament_id, seed)
);

create table public.bracket_match (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournament(id) on delete cascade,
  round int not null,
  position int not null,
  player1_id uuid references public.player(id),
  player2_id uuid references public.player(id),
  match_id uuid references public.match(id),
  next_bracket_match_id uuid references public.bracket_match(id),
  next_slot smallint check (next_slot in (1, 2)),
  winner_player_id uuid references public.player(id),
  unique (tournament_id, round, position)
);

alter table public.match
  add column bracket_match_id uuid references public.bracket_match(id);

create index player_tournament_id_seed_idx on public.player (tournament_id, seed);
create index bracket_match_tournament_round_position_idx
  on public.bracket_match (tournament_id, round, position);
create index bracket_match_next_bracket_match_id_idx
  on public.bracket_match (next_bracket_match_id);
create index match_bracket_match_id_idx on public.match (bracket_match_id);

alter table public.tournament enable row level security;
alter table public.player enable row level security;
alter table public.bracket_match enable row level security;

comment on table public.bracket_match is
  'winner_player_id is stored to simplify byes and idempotent advancement; match scores remain derived from toss logs.';

create policy "anon can read tournaments"
  on public.tournament for select
  to anon
  using (true);

create policy "anon can write tournaments for mvp"
  on public.tournament for all
  to anon
  using (true)
  with check (true);

create policy "anon can read players"
  on public.player for select
  to anon
  using (true);

create policy "anon can write players for mvp"
  on public.player for all
  to anon
  using (true)
  with check (true);

create policy "anon can read bracket matches"
  on public.bracket_match for select
  to anon
  using (true);

create policy "anon can write bracket matches for mvp"
  on public.bracket_match for all
  to anon
  using (true)
  with check (true);
