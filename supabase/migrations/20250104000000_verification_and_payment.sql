-- ---------------------------------------------------------------------------
-- Verification-loop tracking + payment insert policy.
-- ---------------------------------------------------------------------------
alter table public.jobs
  add column if not exists verification_token   text unique,
  add column if not exists verification_sent_at timestamptz;

create index if not exists jobs_active_unverified_idx
  on public.jobs(last_verified_at)
  where status = 'ACTIVE' and verification_token is null;

create index if not exists jobs_verification_pending_idx
  on public.jobs(verification_sent_at)
  where status = 'ACTIVE' and verification_token is not null;

drop policy if exists "payments_user_insert_own" on public.payments;
create policy "payments_user_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);