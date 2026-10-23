-- Indexes to support RLS policies that filter by auth.uid()
-- These prevent sequential scans on hot RLS paths as the dataset grows.

create index if not exists applications_seeker_id_idx
  on public.applications(seeker_id);

create index if not exists companies_employer_id_idx
  on public.companies(employer_id);

create index if not exists jobs_company_id_idx
  on public.jobs(company_id);

create index if not exists payments_user_id_idx
  on public.payments(user_id);
