-- ============================================================================
-- seed.sql — Local development seed data.
-- Run by `supabase db reset` in local dev.
-- For cloud: paste into the Supabase SQL Editor ONCE (after migrations).
-- Requires pgcrypto for crypt()/gen_salt().
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Auth users
-- The on_auth_user_created trigger (from 20250103000000_auth_trigger.sql)
-- mirrors these into public.users automatically.
-- Password for both accounts: "password123"
-- ---------------------------------------------------------------------------
insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'employer@example.com',
   crypt('password123', gen_salt('bf')),
   now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"EMPLOYER","full_name":"Nimal Perera"}',
   now(), now()),

  ('22222222-2222-2222-2222-222222222222',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'seeker@example.com',
   crypt('password123', gen_salt('bf')),
   now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"JOB_SEEKER","full_name":"Kasun Silva"}',
   now(), now());

-- ---------------------------------------------------------------------------
-- Company (no slug / website columns in schema)
-- ---------------------------------------------------------------------------
insert into public.companies
  (id, employer_id, company_name, logo_url, description, is_verified)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'Acme Lanka (Pvt) Ltd',
   null,
   'A fast-growing SaaS company based in Colombo.',
   true);

-- ---------------------------------------------------------------------------
-- Jobs — category must be an UPPERCASE enum value:
--   ENGINEERING, DESIGN, MARKETING, SALES, CUSTOMER_SUPPORT,
--   FINANCE, OPERATIONS, HR, OTHER
-- ---------------------------------------------------------------------------
insert into public.jobs
  (id, company_id, title, description, category, location, work_type,
   salary_min, salary_max, status, last_verified_at)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Senior Full-Stack Developer',
   'Build scalable web apps with Next.js and Supabase.',
   'ENGINEERING', 'Colombo', 'HYBRID',
   250000, 400000, 'ACTIVE', now() - interval '2 days'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Product Designer',
   'Own end-to-end UX for our next-gen products.',
   'DESIGN', 'Remote', 'REMOTE',
   180000, 300000, 'ACTIVE', now() - interval '20 days'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Marketing Intern',
   'Learn growth marketing across paid & organic channels.',
   'MARKETING', 'Colombo', 'ONSITE',
   40000, 60000, 'DRAFT', null);

-- ---------------------------------------------------------------------------
-- Application (no cover_note column)
-- ---------------------------------------------------------------------------
insert into public.applications
  (job_id, seeker_id, resume_url, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
   '22222222-2222-2222-2222-222222222222',
   'resumes/22222222-2222-2222-2222-222222222222/kasun-silva.pdf',
   'PENDING');

-- ---------------------------------------------------------------------------
-- Payment (no purpose column — job_id link is the purpose)
-- ---------------------------------------------------------------------------
insert into public.payments
  (user_id, job_id, order_id, amount, currency, status)
values
  ('11111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
   'seed-order-0001',
   2500.00, 'LKR', 'COMPLETED');