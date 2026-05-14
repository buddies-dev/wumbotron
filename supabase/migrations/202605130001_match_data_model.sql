create table public.match (
  id uuid primary key default gen_random_uuid(),
  player1_name text not null,
  player2_name text not null,
  first_tosser smallint not null check (first_tosser in (1, 2)),
  status text not null default 'active' check (status in ('active', 'complete')),
  winner_slot smallint check (winner_slot in (1, 2)),
  created_at timestamptz not null default now()
);

create table public.inning (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.match(id) on delete cascade,
  number int not null,
  phase text not null default 'regulation'
    check (phase in ('regulation', 'redemption', 'overtime', 'sudden_death')),
  unique (match_id, number)
);

create table public.toss (
  id uuid primary key default gen_random_uuid(),
  inning_id uuid not null references public.inning(id) on delete cascade,
  player_slot smallint not null check (player_slot in (1, 2)),
  value smallint not null check (value in (-2, 0, 1, 2, 3)),
  order_in_inning smallint not null,
  created_at timestamptz not null default now()
);

create index inning_match_id_number_idx on public.inning (match_id, number);
create index toss_inning_id_order_in_inning_idx on public.toss (inning_id, order_in_inning);

alter table public.match enable row level security;
alter table public.inning enable row level security;
alter table public.toss enable row level security;

comment on table public.match is
  'MVP policies intentionally allow anon writes until real auth ownership lands.';
comment on table public.inning is
  'Phase is denormalized for query convenience; the pure toss-log derivation remains source of truth.';

create policy "anon can read matches"
  on public.match for select
  to anon
  using (true);

create policy "anon can write matches for mvp"
  on public.match for all
  to anon
  using (true)
  with check (true);

create policy "anon can read innings"
  on public.inning for select
  to anon
  using (true);

create policy "anon can write innings for mvp"
  on public.inning for all
  to anon
  using (true)
  with check (true);

create policy "anon can read tosses"
  on public.toss for select
  to anon
  using (true);

create policy "anon can write tosses for mvp"
  on public.toss for all
  to anon
  using (true)
  with check (true);
