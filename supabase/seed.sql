-- ============================================================================
-- seed.sql — Local development seed data.
-- Run automatically by `supabase db reset` after migrations.
-- Do NOT run in production.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Auth users (the trigger public.handle_new_user() will mirror these)
-- Password for all: "password123"  (bcrypt hash below)
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
-- Companies
-- ---------------------------------------------------------------------------
insert into public.companies
  (id, employer_id, company_name, slug, logo_url, website, description, is_verified)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'Acme Lanka (Pvt) Ltd',
   'acme-lanka',
   null,
   'https://acme.example.com',
   'A fast-growing SaaS company based in Colombo.',
   true);

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------
insert into public.jobs
  (id, company_id, title, slug, description, category, location, work_type,
   salary_min, salary_max, status, last_verified_at)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Senior Full-Stack Developer',
   'senior-full-stack-developer',
   'Build scalable web apps with Next.js and Supabase.',
   'Engineering', 'Colombo', 'HYBRID',
   250000, 400000, 'ACTIVE', now() - interval '2 days'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Product Designer',
   'product-designer',
   'Own end-to-end UX for our next-gen products.',
   'Design', 'Remote', 'REMOTE',
   180000, 300000, 'ACTIVE', now() - interval '20 days'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Marketing Intern',
   'marketing-intern',
   'Learn growth marketing across paid & organic channels.',
   'Marketing', 'Colombo', 'ONSITE',
   40000, 60000, 'DRAFT', null);

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------
insert into public.applications
  (job_id, seeker_id, resume_url, cover_note, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
   '22222222-2222-2222-2222-222222222222',
   'resumes/22222222-2222-2222-2222-222222222222/kasun-silva.pdf',
   'I have 6 years of experience building Next.js apps.',
   'PENDING');

-- ---------------------------------------------------------------------------
-- Payment (DRAFT -> ACTIVE example)
-- ---------------------------------------------------------------------------
insert into public.payments
  (user_id, job_id, purpose, order_id, amount, currency, status)
values
  ('11111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
   'JOB_POSTING',
   'seed-order-0001',
   2500.00, 'LKR', 'COMPLETED');