-- ============================================================================
-- Consolidated fix: adds the missing `category` column to jobs and installs
-- the auth trigger that mirrors auth.users → public.users.
-- Idempotent — safe to run against a remote that may already have partial
-- state from a previous failed push.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add the category column (no-op if it already exists)
-- ---------------------------------------------------------------------------
alter table public.jobs
  add column if not exists category text;

-- ---------------------------------------------------------------------------
-- 2. Enforce the allowed values (drop-then-recreate so it works on re-run)
-- ---------------------------------------------------------------------------
alter table public.jobs drop constraint if exists jobs_category_check;
alter table public.jobs
  add constraint jobs_category_check check (
    category is null or category in (
      'ENGINEERING', 'DESIGN', 'MARKETING', 'SALES', 'CUSTOMER_SUPPORT',
      'FINANCE', 'OPERATIONS', 'HR', 'OTHER'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
create index if not exists jobs_category_idx
  on public.jobs(category);
create index if not exists jobs_status_category_created_idx
  on public.jobs(status, category, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. Auth mirror function — inserts a public.users row on every auth signup
--    Reads role from raw_user_meta_data.role (set during supabase.auth.signUp)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(upper(new.raw_user_meta_data ->> 'role'), 'JOB_SEEKER')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Trigger — wires handle_new_user() to new auth.users rows
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();