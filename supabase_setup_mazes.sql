-- Mazes table (maze editor save data)
-- Stores maze definitions as JSON for sharing across devices.

-- 1. Create mazes table
create table if not exists mazes (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  data jsonb not null,
  created_by uuid references players(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable RLS (policy is open for this family app)
alter table mazes enable row level security;

-- 3. Policy (Open for family / anon key)
do $$
begin
  create policy "Enable all access for anon" on mazes
  for all
  to anon
  using (true)
  with check (true);
exception
  when duplicate_object then null;
end $$;

