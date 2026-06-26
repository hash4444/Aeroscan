-- A single training session. Created client-side (with a client-generated id)
-- when the user taps "Start Session" so it works offline; `ended_at`/`status`
-- are filled in when the buffered readings are uploaded at session end.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  resistance_level int,
  status text not null default 'active' check (status in ('active', 'completed', 'aborted')),
  created_at timestamptz not null default now()
);

create index sessions_user_id_started_at_idx on public.sessions (user_id, started_at desc);

alter table public.sessions enable row level security;

create policy "sessions_select_own"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "sessions_insert_own"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "sessions_update_own"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions_delete_own"
  on public.sessions for delete
  using (auth.uid() = user_id);
