-- ---------------------------------------------------------------------------
-- UUID helper: use the built-in gen_random_uuid() (PostgreSQL 13+).
-- No extensions required.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text unique not null,
  role         text not null check (role in ('EMPLOYER','JOB_SEEKER')),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create table public.companies (
  id           uuid primary key default gen_random_uuid(),
  employer_id  uuid not null references public.users(id) on delete cascade,
  company_name text not null,
  logo_url     text,
  description  text,
  is_verified  boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
create table public.jobs (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  title             text not null,
  description       text not null,
  location          text not null,
  work_type         text not null check (work_type in ('REMOTE','ONSITE','HYBRID')),
  salary_min        integer,
  salary_max        integer,
  status            text not null default 'DRAFT'
                    check (status in ('DRAFT','ACTIVE','FILLED','EXPIRED','ARCHIVED')),
  created_at        timestamptz not null default now(),
  last_verified_at  timestamptz
);
create index jobs_status_idx     on public.jobs(status);
create index jobs_created_at_idx on public.jobs(created_at desc);

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
create table public.applications (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  seeker_id   uuid not null references public.users(id) on delete cascade,
  resume_url  text not null,
  status      text not null default 'PENDING'
              check (status in ('PENDING','REVIEWED','SHORTLISTED','REJECTED')),
  applied_at  timestamptz not null default now(),
  unique (job_id, seeker_id)
);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  job_id            uuid references public.jobs(id) on delete set null,
  order_id          text unique not null,
  amount            numeric(10,2) not null,
  currency          text not null default 'LKR',
  status            text not null default 'PENDING'
                    check (status in ('PENDING','COMPLETED','FAILED')),
  gateway_reference text,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.users        enable row level security;
alter table public.companies    enable row level security;
alter table public.jobs         enable row level security;
alter table public.applications enable row level security;
alter table public.payments     enable row level security;

-- users
create policy "users_select_self" on public.users
  for select using (auth.uid() = id);
create policy "users_update_self" on public.users
  for update using (auth.uid() = id);

-- companies
create policy "companies_public_read" on public.companies
  for select using (true);
create policy "companies_employer_write" on public.companies
  for all using (auth.uid() = employer_id)
  with check (auth.uid() = employer_id);

-- jobs
create policy "jobs_public_read_active" on public.jobs
  for select using (status = 'ACTIVE');
create policy "jobs_employer_read_own" on public.jobs
  for select using (
    exists (select 1 from public.companies c
            where c.id = jobs.company_id and c.employer_id = auth.uid())
  );
create policy "jobs_employer_write_own" on public.jobs
  for all using (
    exists (select 1 from public.companies c
            where c.id = jobs.company_id and c.employer_id = auth.uid())
  ) with check (
    exists (select 1 from public.companies c
            where c.id = jobs.company_id and c.employer_id = auth.uid())
  );

-- applications
create policy "applications_seeker_own" on public.applications
  for all using (auth.uid() = seeker_id)
  with check (auth.uid() = seeker_id);
create policy "applications_employer_read" on public.applications
  for select using (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = applications.job_id and c.employer_id = auth.uid()
    )
  );

-- payments
create policy "payments_user_read_own" on public.payments
  for select using (auth.uid() = user_id);