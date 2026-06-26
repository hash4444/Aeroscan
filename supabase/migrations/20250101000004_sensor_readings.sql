-- High-frequency (~1Hz) sensor samples for a session. The app buffers these
-- locally during a session and uploads the whole batch in one write at
-- session end, so we expect occasional large inserts rather than one-row-
-- at-a-time writes. A bigint identity key keeps the per-row index cost low;
-- the (session_id, ts) index is what every read/graph query actually uses.
-- Revisit range partitioning by `ts` if a single sessions table outgrows a
-- few hundred million rows — not needed for MVP volume.
create table public.sensor_readings (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  ts timestamptz not null,
  co2_ppm numeric,
  gas_resistance_ohm numeric,
  voc_index numeric,
  heart_rate numeric,
  hrv_ms numeric,
  resp_rate numeric,
  temp_c numeric,
  humidity_pct numeric,
  created_at timestamptz not null default now()
);

create index sensor_readings_session_id_ts_idx on public.sensor_readings (session_id, ts);

alter table public.sensor_readings enable row level security;

create policy "sensor_readings_select_own"
  on public.sensor_readings for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = sensor_readings.session_id
        and s.user_id = auth.uid()
    )
  );

create policy "sensor_readings_insert_own"
  on public.sensor_readings for insert
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = sensor_readings.session_id
        and s.user_id = auth.uid()
    )
  );
