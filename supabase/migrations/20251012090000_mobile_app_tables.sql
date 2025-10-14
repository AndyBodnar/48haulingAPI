-- Notifications table (per-user)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('announcement','load_update','system','issue_update')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.notifications enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and polname = 'Users can view own notifications'
  ) then
    create policy "Users can view own notifications" on public.notifications
      for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and polname = 'Users can mark own notifications read'
  ) then
    create policy "Users can mark own notifications read" on public.notifications
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_notifications_user_unread on public.notifications (user_id) where read_at is null;
create index if not exists idx_notifications_created_at on public.notifications (created_at desc);

-- Announcements table (global read, server-side writes)
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  posted_at timestamptz not null default now(),
  posted_by uuid references auth.users (id)
);

alter table public.announcements enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'announcements' and polname = 'All authenticated can read announcements'
  ) then
    create policy "All authenticated can read announcements" on public.announcements
      for select using (true);
  end if;
end $$;

-- Jobs table adjustments for mobile
alter table public.jobs add column if not exists reference text;
alter table public.jobs add column if not exists pickup_address text;
alter table public.jobs add column if not exists delivery_address text;
alter table public.jobs add column if not exists assigned_to uuid references auth.users (id);

alter table public.jobs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'jobs' and polname = 'Drivers can read own jobs'
  ) then
    create policy "Drivers can read own jobs" on public.jobs
      for select using (assigned_to = auth.uid());
  end if;
end $$;

-- Time logs RLS safety (if table exists)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='time_logs') then
    execute 'alter table public.time_logs enable row level security';
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='time_logs' and polname='Users can read own time logs'
    ) then
      create policy "Users can read own time logs" on public.time_logs for select using (user_id = auth.uid());
    end if;
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='time_logs' and polname='Users can insert own time logs'
    ) then
      create policy "Users can insert own time logs" on public.time_logs for insert with check (user_id = auth.uid());
    end if;
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='time_logs' and polname='Users can update own time logs'
    ) then
      create policy "Users can update own time logs" on public.time_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
    end if;
  end if;
end $$;

-- Realtime publication
do $$ begin
  begin
    execute 'alter publication supabase_realtime add table public.notifications';
  exception when duplicate_object then
    -- already added
    null;
  end;
end $$;

