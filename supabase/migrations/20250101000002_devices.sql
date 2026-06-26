-- A paired AeroScan mask. `device_id` is the hardware serial / BLE identifier
-- advertised by the device, distinct from the row's own primary key.
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null unique,
  name text,
  mask_size text check (mask_size in ('s', 'm', 'l')),
  firmware_version text,
  paired_at timestamptz not null default now(),
  last_connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index devices_user_id_idx on public.devices (user_id);

alter table public.devices enable row level security;

create policy "devices_select_own"
  on public.devices for select
  using (auth.uid() = user_id);

create policy "devices_insert_own"
  on public.devices for insert
  with check (auth.uid() = user_id);

create policy "devices_update_own"
  on public.devices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "devices_delete_own"
  on public.devices for delete
  using (auth.uid() = user_id);

create trigger devices_set_updated_at
  before update on public.devices
  for each row
  execute function public.set_updated_at();
