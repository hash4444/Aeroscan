-- One row per session, computed once by the compute-session-summary edge
-- function after the full reading batch has been uploaded. Never written
-- per-reading. Scores are relative 0-100 indices, not clinical values
-- (see lib/scoring) — this table must never gain raw diagnostic fields.
create table public.session_summaries (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  avg_fat_burn_index numeric,
  avg_breathing_efficiency numeric,
  duration_sec int,
  calories_est numeric,
  computed_at timestamptz not null default now()
);

alter table public.session_summaries enable row level security;

create policy "session_summaries_select_own"
  on public.session_summaries for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_summaries.session_id
        and s.user_id = auth.uid()
    )
  );

create policy "session_summaries_insert_own"
  on public.session_summaries for insert
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_summaries.session_id
        and s.user_id = auth.uid()
    )
  );

create policy "session_summaries_update_own"
  on public.session_summaries for update
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_summaries.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_summaries.session_id
        and s.user_id = auth.uid()
    )
  );
