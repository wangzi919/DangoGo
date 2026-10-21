-- ==============================================================================
-- DangoGo (糰子日語) - Supabase Database Schema
-- ==============================================================================

-- 1. Vocabulary Table
create table if not exists public.vocabularies (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  word text not null,
  reading text not null,
  meaning text not null,
  example text,
  level text default 'N5',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Mistakes Table
create table if not exists public.mistakes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  target_id text not null,
  type text not null,
  prompt text not null,
  expected jsonb not null,
  display text not null,
  fail_count integer default 1,
  last_failed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. User Stats Table
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade not null,
  streak integer default 0,
  last_active_date text,
  total_kana_answered integer default 0,
  total_kana_correct integer default 0,
  total_vocab_answered integer default 0,
  total_vocab_correct integer default 0,
  best_accuracy numeric default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable Row Level Security (RLS)
alter table public.vocabularies enable row level security;
alter table public.mistakes enable row level security;
alter table public.user_stats enable row level security;

-- 5. Policies
drop policy if exists "Users can manage their own vocabulary" on public.vocabularies;
create policy "Users can manage their own vocabulary" on public.vocabularies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own mistakes" on public.mistakes;
create policy "Users can manage their own mistakes" on public.mistakes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own stats" on public.user_stats;
create policy "Users can manage their own stats" on public.user_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
