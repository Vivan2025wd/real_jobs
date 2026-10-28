-- ---------------------------------------------------------------------------
-- Job lifecycle + notification tracking.
--
-- Adds:
--   • duration_days — employer-chosen posting length (7, 14, or 30 days)
--   • expires_at    — computed deadline; expire cron enforces it
--   • notification  — timestamps to prevent duplicate emails
-- ---------------------------------------------------------------------------

-- ─── Duration ───
alter table public.jobs
  add column if not exists duration_days integer not null default 14
    check (duration_days in (7, 14, 30));

-- ─── Expiry ───
alter table public.jobs
  add column if not exists expires_at timestamptz;

-- Backfill: existing jobs get duration-based expiry from created_at
update public.jobs
set expires_at = created_at + (duration_days || ' days')::interval
where expires_at is null;

-- New jobs must have expires_at (enforce going forward)
alter table public.jobs
  alter column expires_at set not null;

-- ─── Notification tracking ───
alter table public.jobs
  add column if not exists notified_10_applicants_at timestamptz,
  add column if not exists notified_stale_at         timestamptz,
  add column if not exists notified_expiring_at      timestamptz;

-- ─── Indexes for the new cron queries ───
create index if not exists jobs_expires_at_active_idx
  on public.jobs(expires_at)
  where status = 'ACTIVE';

create index if not exists jobs_notify_10_apps_idx
  on public.jobs(id)
  where status = 'ACTIVE' and notified_10_applicants_at is null;

create index if not exists jobs_notify_stale_idx
  on public.jobs(created_at)
  where status = 'ACTIVE' and notified_stale_at is null;

create index if not exists jobs_notify_expiring_idx
  on public.jobs(expires_at)
  where status = 'ACTIVE' and notified_expiring_at is null;