-- ---------------------------------------------------------------------------
-- Lock the price at draft creation.
--
-- Without this, a draft created when 7-day = 2,499 would be charged whatever
-- the code says at payment time. If pricing changes between draft creation
-- and payment, the employer sees a different amount than expected.
--
-- Storing price_lkr on the job row guarantees the amount shown to the
-- employer at creation is the amount charged.
-- ---------------------------------------------------------------------------
alter table public.jobs
  add column if not exists price_lkr integer;

-- Backfill: existing jobs get the price for their duration_days
update public.jobs
set price_lkr = case duration_days
  when 7 then 2499
  when 14 then 4499
  when 30 then 8499
  else 4499
end
where price_lkr is null;

-- Going forward, every job must have a price
alter table public.jobs
  alter column price_lkr set not null;