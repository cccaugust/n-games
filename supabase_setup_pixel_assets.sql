-- Pixel Art Maker assets (dot art) tables
-- Designed for future "frames" (walk/attack animations).
-- - pixel_assets: metadata (one per asset)
-- - pixel_asset_frames: frame data (0..N-1)

-- 1) Assets table
create table if not exists pixel_assets (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references players(id) on delete cascade not null,
  name text not null,
  kind text not null check (kind in ('character', 'object', 'tile')),
  width int not null,
  height int not null,
  frame_count int not null default 1,
  data_version int not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) Frames table
create table if not exists pixel_asset_frames (
  id uuid default gen_random_uuid() primary key,
  asset_id uuid references pixel_assets(id) on delete cascade not null,
  frame_index int not null,
  width int not null,
  height int not null,
  pixels_b64 text not null,
  duration_ms int not null default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(asset_id, frame_index)
);

-- 3) Enable RLS (policy is open for this family app)
alter table pixel_assets enable row level security;
alter table pixel_asset_frames enable row level security;

-- 4) Policy (Open for family / anon key)
do $$
begin
  create policy "Enable all access for anon" on pixel_assets
  for all
  to anon
  using (true)
  with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Enable all access for anon" on pixel_asset_frames
  for all
  to anon
  using (true)
  with check (true);
exception
  when duplicate_object then null;
end $$;

