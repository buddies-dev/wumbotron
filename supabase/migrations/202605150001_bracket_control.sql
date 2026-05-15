alter table public.tournament
  add column featured_match_id uuid references public.match(id),
  add column accent_color text,
  drop constraint tournament_status_check,
  add constraint tournament_status_check
    check (status in ('active', 'complete', 'abandoned'));

create index tournament_featured_match_id_idx
  on public.tournament (featured_match_id);
