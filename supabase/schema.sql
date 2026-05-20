create table if not exists public.learning_blocks (
  id text primary key,
  title text not null,
  topic text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.learning_blocks enable row level security;

drop policy if exists "public read learning blocks" on public.learning_blocks;
create policy "public read learning blocks"
on public.learning_blocks for select
using (true);

drop policy if exists "public write learning blocks" on public.learning_blocks;
create policy "public write learning blocks"
on public.learning_blocks for insert
with check (true);

drop policy if exists "public update learning blocks" on public.learning_blocks;
create policy "public update learning blocks"
on public.learning_blocks for update
using (true)
with check (true);

