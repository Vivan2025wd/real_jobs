-- Drop old catch-all policy
drop policy if exists "jobs_employer_write_own" on public.jobs;

-- 1. Insert Policy (Prevent direct ACTIVE publish)
create policy "jobs_employer_insert_own"
  on public.jobs
  for insert
  with check (
    status <> 'ACTIVE'
    and exists (
      select 1
      from public.companies c
      where c.id = jobs.company_id
        and c.employer_id = auth.uid()
    )
  );

-- 2. Update Policy
create policy "jobs_employer_update_own"
  on public.jobs
  for update
  using (
    exists (
      select 1
      from public.companies c
      where c.id = jobs.company_id
        and c.employer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.companies c
      where c.id = jobs.company_id
        and c.employer_id = auth.uid()
    )
  );

-- 3. Delete Policy
create policy "jobs_employer_delete_own"
  on public.jobs
  for delete
  using (
    exists (
      select 1
      from public.companies c
      where c.id = jobs.company_id
        and c.employer_id = auth.uid()
    )
  );

-- 4. Trigger Function to prevent price/publish manipulation
create or replace function public.prevent_employer_job_publish_or_reprice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then
      if new.status = 'ACTIVE' then
        raise exception 'Employers cannot publish jobs without payment'
          using errcode = '42501';
      end if;

      if new.price_lkr is distinct from (
        case new.duration_days
          when 7 then 2499
          when 14 then 4499
          when 30 then 8499
          else null
        end
      ) then
        raise exception 'Employers must use the configured job price'
          using errcode = '42501';
      end if;
    end if;

    if tg_op = 'UPDATE' then
      if old.status is distinct from 'ACTIVE' and new.status = 'ACTIVE' then
        raise exception 'Employers cannot publish jobs without payment'
          using errcode = '42501';
      end if;

      if new.price_lkr is distinct from old.price_lkr then
        raise exception 'Employers cannot change a job price'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Drop trigger if it already exists before creating
drop trigger if exists prevent_employer_job_publish_or_reprice on public.jobs;

-- Create the trigger
create trigger prevent_employer_job_publish_or_reprice
  before insert or update on public.jobs
  for each row
  execute function public.prevent_employer_job_publish_or_reprice();