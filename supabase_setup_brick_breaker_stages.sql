-- Brick Breaker stages table (stage editor save data)
-- Stores brick-breaker stage definitions as JSON for sharing across devices.

-- 1. Create brick_breaker_stages table
create table if not exists brick_breaker_stages (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  data jsonb not null,
  created_by uuid references players(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable RLS (policy is open for this family app)
alter table brick_breaker_stages enable row level security;

-- 3. Policy (Open for family / anon key)
do $$
begin
  create policy "Enable all access for anon" on brick_breaker_stages
  for all
  to anon
  using (true)
  with check (true);
exception
  when duplicate_object then null;
end $$;

