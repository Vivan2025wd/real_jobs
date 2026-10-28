-- ---------------------------------------------------------------------------
-- Let employers read the user row of someone who applied to their jobs.
--
-- Why: the employer dashboard embeds users!inner(email):
--     .from("applications")
--     .select("id, status, applied_at, jobs!inner(...), users!inner(email)")
--
-- public.users was readable only via users_select_self (auth.uid() = id), so
-- the embedded users resource came back empty for employers. Because the
-- embed is !inner, that empty side dropped the whole parent row — the
-- "Recent applications" list and the job-detail applications list rendered 0
-- while the count query (which never touches users) still reported 1.
--
-- Scope: an employer may read a user row ONLY if that user has an application
-- to a job owned by one of the employer's companies. No table-wide read, and
-- seekers still see only themselves via users_select_self.
--
-- No RLS recursion: this policy's subqueries touch applications -> jobs ->
-- companies, and none of those tables' policies reference public.users.
-- Verified against pg_policies before applying.
-- ---------------------------------------------------------------------------

create policy "users_employer_read_applicants"
  on public.users
  for select
  using (
    exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.companies c on c.id = j.company_id
      where a.seeker_id = users.id
        and c.employer_id = auth.uid()
    )
  );

-- The policy probes applications by seeker_id per users row. The existing
-- unique (job_id, seeker_id) index leads on job_id, so it cannot serve this
-- lookup — add a dedicated one to keep the embedded join cheap as data grows.
create index if not exists applications_seeker_id_idx
  on public.applications (seeker_id);
