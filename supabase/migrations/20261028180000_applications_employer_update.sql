-- 20261028180000_applications_employer_update.sql
--
-- Employers need to update the status of applications to their own jobs
-- (Pending → Reviewed → Shortlisted / Rejected).
--
-- The existing applications_employer_read policy only covers SELECT.
-- applications_seeker_own is `for all` but restricted to auth.uid() = seeker_id,
-- so employers had NO UPDATE path — writes were silently blocked by RLS.
create policy "applications_employer_update"
  on public.applications
  for update
  using (
    exists (
      select 1
      from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = applications.job_id
        and c.employer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = applications.job_id
        and c.employer_id = auth.uid()
    )
  );