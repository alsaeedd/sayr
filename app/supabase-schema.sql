-- Run this in your Supabase SQL editor

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  location_lat decimal,
  location_lng decimal,
  timezone text default 'UTC',
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sessions table
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  current_step int default 1 check (current_step between 1 and 6),
  status text default 'active' check (status in ('active', 'completed', 'abandoned')),
  musharata jsonb,
  muraqaba jsonb,
  muhasaba jsonb,
  muaqaba jsonb,
  mujahada jsonb,
  muataba jsonb,
  started_at timestamptz default now(),
  completed_at timestamptz,
  session_duration_minutes int
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can view own sessions"
  on public.sessions for select using (auth.uid() = user_id);

create policy "Users can create own sessions"
  on public.sessions for insert with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update using (auth.uid() = user_id);

-- Index for fast session queries
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_status on public.sessions(user_id, status);
