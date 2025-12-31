-- 1. Create the players table
create table players (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  avatar text default '😀',
  created_at timestamptz default now()
);

-- 2. Disable Row Level Security (RLS) for simplicity in this family app
--    WARNING: This allows anyone with the key to edit data. 
--    For a family app, it's acceptable. For a public app, you would enable RLS.
alter table players enable row level security;

-- 3. Create a policy to allow EVERYTHING for valid API keys (anon)
create policy "Enable all access for anon" on players
for all
to anon
using (true)
with check (true);
