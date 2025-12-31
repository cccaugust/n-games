-- 1. Create scores table
-- This stores the history of all games played (or high scores).
create table scores (
  id uuid default gen_random_uuid() primary key,
  game_id text not null,
  player_id uuid references players(id) on delete cascade not null,
  score int not null,
  created_at timestamptz default now()
);

-- 2. Enable RLS
alter table scores enable row level security;

-- 3. Policy (Open for family)
create policy "Enable all access for anon" on scores
for all
to anon
using (true)
with check (true);
