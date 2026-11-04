-- Fresh/empty Supabase project only. Do not run on a database with older versions of these tables.
-- RealJobs.lk master schema, consolidated from the chronological migrations.

-- 1. Extensions
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Tables (final column state)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role text NOT NULL,
  full_name text,
  resume_url text,
  resume_uploaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  logo_url text,
  description text,
  is_verified boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  total_applications_90d integer NOT NULL DEFAULT 0,
  responded_applications_90d integer NOT NULL DEFAULT 0,
  avg_response_hours numeric,
  response_rate_cached_at timestamptz,
  free_jobs_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  work_type text NOT NULL,
  category text,
  salary_min integer,
  salary_max integer,
  status text NOT NULL DEFAULT 'DRAFT',
  duration_days integer NOT NULL DEFAULT 14,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  price_lkr integer NOT NULL,
  job_image_url text,
  source text NOT NULL DEFAULT 'NATIVE',
  source_url text,
  external_company_name text,
  claimed_at timestamptz,
  applications_purge_at timestamptz,
  published_at timestamptz,
  last_verified_at timestamptz,
  verification_token text UNIQUE,
  verification_sent_at timestamptz,
  notified_10_applicants_at timestamptz,
  notified_stale_at timestamptz,
  notified_expiring_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  seeker_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resume_url text,
  cover_letter text,
  consent_at timestamptz,
  status text NOT NULL DEFAULT 'PENDING',
  applied_at timestamptz NOT NULL DEFAULT now(),
  first_responded_at timestamptz,
  anonymized_at timestamptz,
  UNIQUE (job_id, seeker_id)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  order_id text NOT NULL UNIQUE,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'LKR',
  status text NOT NULL DEFAULT 'PENDING',
  gateway_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_external_contacts (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  contact_email text NOT NULL,
  claim_token_hash text UNIQUE,
  claim_token_expires_at timestamptz,
  notify_count integer NOT NULL DEFAULT 0,
  last_notified_at timestamptz,
  milestone_notified_at timestamptz,
  milestone_token_hash text,
  milestone_token_expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email text PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.claim_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filters jsonb NOT NULL,
  alert_frequency text NOT NULL DEFAULT 'DAILY',
  last_alerted_at timestamptz NOT NULL DEFAULT now(),
  unsubscribe_token text NOT NULL UNIQUE
    DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, filters)
);

-- 3. Idempotent additions for columns introduced by later migrations.
-- They are already present in the final CREATE TABLE definitions above.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS resume_url text,
  ADD COLUMN IF NOT EXISTS resume_uploaded_at timestamptz;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_applications_90d integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS responded_applications_90d integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_response_hours numeric,
  ADD COLUMN IF NOT EXISTS response_rate_cached_at timestamptz,
  ADD COLUMN IF NOT EXISTS free_jobs_used integer NOT NULL DEFAULT 0;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS verification_token text,
  ADD COLUMN IF NOT EXISTS verification_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_10_applicants_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_stale_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_expiring_at timestamptz,
  ADD COLUMN IF NOT EXISTS price_lkr integer,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS job_image_url text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'NATIVE',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS external_company_name text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS applications_purge_at timestamptz;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS first_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS cover_letter text,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

ALTER TABLE public.job_external_contacts
  ADD COLUMN IF NOT EXISTS notify_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS milestone_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS milestone_token_hash text,
  ADD COLUMN IF NOT EXISTS milestone_token_expires_at timestamptz;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS companies_employer_id_idx
  ON public.companies (employer_id);
CREATE UNIQUE INDEX IF NOT EXISTS companies_employer_id_non_system_key
  ON public.companies (employer_id) WHERE is_system = false;
CREATE UNIQUE INDEX IF NOT EXISTS companies_employer_id_system_key
  ON public.companies (employer_id) WHERE is_system = true;

CREATE INDEX IF NOT EXISTS jobs_status_idx ON public.jobs (status);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON public.jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_company_id_idx ON public.jobs (company_id);
CREATE INDEX IF NOT EXISTS jobs_category_idx ON public.jobs (category);
CREATE INDEX IF NOT EXISTS jobs_status_category_created_idx
  ON public.jobs (status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_active_unverified_idx
  ON public.jobs (last_verified_at)
  WHERE status = 'ACTIVE' AND verification_token IS NULL;
CREATE INDEX IF NOT EXISTS jobs_verification_pending_idx
  ON public.jobs (verification_sent_at)
  WHERE status = 'ACTIVE' AND verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS jobs_expires_at_active_idx
  ON public.jobs (expires_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS jobs_notify_10_apps_idx
  ON public.jobs (id)
  WHERE status = 'ACTIVE' AND notified_10_applicants_at IS NULL;
CREATE INDEX IF NOT EXISTS jobs_notify_stale_idx
  ON public.jobs (created_at)
  WHERE status = 'ACTIVE' AND notified_stale_at IS NULL;
CREATE INDEX IF NOT EXISTS jobs_notify_expiring_idx
  ON public.jobs (expires_at)
  WHERE status = 'ACTIVE' AND notified_expiring_at IS NULL;
CREATE INDEX IF NOT EXISTS jobs_active_published_at_idx
  ON public.jobs (published_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS jobs_applications_purge_at_idx
  ON public.jobs (applications_purge_at)
  WHERE applications_purge_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS applications_seeker_id_idx
  ON public.applications (seeker_id);
CREATE INDEX IF NOT EXISTS applications_seeker_id_active_idx
  ON public.applications (seeker_id) WHERE anonymized_at IS NULL;
CREATE INDEX IF NOT EXISTS applications_job_id_applied_at_idx
  ON public.applications (job_id, applied_at);
CREATE INDEX IF NOT EXISTS idx_applications_seeker_applied
  ON public.applications (seeker_id, applied_at);

CREATE INDEX IF NOT EXISTS payments_user_id_idx
  ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS job_external_contacts_notify_idx
  ON public.job_external_contacts (last_notified_at, notify_count);
CREATE UNIQUE INDEX IF NOT EXISTS job_external_contacts_milestone_token_hash_key
  ON public.job_external_contacts (milestone_token_hash)
  WHERE milestone_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS saved_searches_alert_frequency_idx
  ON public.saved_searches (alert_frequency, last_alerted_at)
  WHERE alert_frequency <> 'NONE';

-- 5. Constraints
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('EMPLOYER', 'JOB_SEEKER'));

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_free_jobs_used_check;
UPDATE public.companies
SET free_jobs_used = least(greatest(free_jobs_used, 0), 2)
WHERE free_jobs_used < 0 OR free_jobs_used > 2;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_free_jobs_used_check CHECK (free_jobs_used BETWEEN 0 AND 2);

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_work_type_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_work_type_check
  CHECK (work_type IN ('REMOTE', 'ONSITE', 'HYBRID'));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_category_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_category_check
  CHECK (
    category IS NULL OR category IN (
      'ENGINEERING', 'DESIGN', 'MARKETING', 'SALES', 'CUSTOMER_SUPPORT',
      'FINANCE', 'OPERATIONS', 'HR', 'OTHER'
    )
  );
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('DRAFT', 'ACTIVE', 'FILLED', 'EXPIRED', 'ARCHIVED', 'CLOSED'));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_duration_days_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_duration_days_check CHECK (duration_days IN (7, 14, 30));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_source_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_source_check CHECK (source IN ('NATIVE', 'EXTERNAL'));

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN'));
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_cover_letter_length_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_cover_letter_length_check
  CHECK (cover_letter IS NULL OR char_length(cover_letter) <= 3000);

ALTER TABLE public.email_suppressions
  DROP CONSTRAINT IF EXISTS email_suppressions_email_check;
ALTER TABLE public.email_suppressions
  ADD CONSTRAINT email_suppressions_email_check CHECK (email = lower(email));

ALTER TABLE public.saved_searches
  DROP CONSTRAINT IF EXISTS saved_searches_filters_check;
ALTER TABLE public.saved_searches
  ADD CONSTRAINT saved_searches_filters_check
  CHECK (
    jsonb_typeof(filters) = 'object'
    AND filters - ARRAY[
      'q', 'location', 'category', 'work_type', 'salary_min', 'sort'
    ]::text[] = '{}'::jsonb
  );
ALTER TABLE public.saved_searches
  DROP CONSTRAINT IF EXISTS saved_searches_alert_frequency_check;
ALTER TABLE public.saved_searches
  ADD CONSTRAINT saved_searches_alert_frequency_check
  CHECK (alert_frequency IN ('DAILY', 'WEEKLY', 'NONE'));

-- 6. Functions / RPCs
CREATE OR REPLACE FUNCTION public.job_price_lkr(p_duration_days integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_duration_days
    WHEN 7 THEN 2499
    WHEN 14 THEN 4499
    WHEN 30 THEN 8499
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.free_jobs_per_employer()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  -- Keep this value aligned with FREE_JOBS_PER_EMPLOYER in src/lib/utils/constants.ts.
  SELECT 2;
$$;

ALTER TABLE public.jobs
  ALTER COLUMN price_lkr SET DEFAULT public.job_price_lkr(14);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(UPPER(NEW.raw_user_meta_data ->> 'role'), 'JOB_SEEKER'),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_saved_search(
  p_filters jsonb,
  p_alert_frequency text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  existing_id uuid;
  saved_search_id uuid;
  search_count integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_alert_frequency NOT IN ('DAILY', 'WEEKLY', 'NONE') THEN
    RAISE EXCEPTION 'Invalid alert frequency';
  END IF;
  IF jsonb_typeof(p_filters) <> 'object'
     OR p_filters - ARRAY[
       'q', 'location', 'category', 'work_type', 'salary_min', 'sort'
     ]::text[] <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid saved-search filters';
  END IF;
  IF NOT (
    COALESCE(NULLIF(TRIM(p_filters ->> 'q'), '') IS NOT NULL, false)
    OR COALESCE(NULLIF(TRIM(p_filters ->> 'location'), '') IS NOT NULL, false)
    OR COALESCE(NULLIF(TRIM(p_filters ->> 'category'), '') IS NOT NULL, false)
    OR COALESCE(NULLIF(TRIM(p_filters ->> 'work_type'), '') IS NOT NULL, false)
    OR COALESCE(
      CASE
        WHEN jsonb_typeof(p_filters -> 'salary_min') = 'number'
          THEN (p_filters ->> 'salary_min')::numeric > 0
        ELSE false
      END,
      false
    )
  ) THEN
    RAISE EXCEPTION 'At least one search filter is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));
  SELECT id INTO existing_id
  FROM public.saved_searches
  WHERE user_id = current_user_id AND filters = p_filters;

  IF existing_id IS NULL THEN
    SELECT count(*) INTO search_count
    FROM public.saved_searches
    WHERE user_id = current_user_id;
    IF search_count >= 10 THEN
      RAISE EXCEPTION 'You can save up to 10 searches';
    END IF;
  END IF;

  INSERT INTO public.saved_searches (user_id, filters, alert_frequency)
  VALUES (current_user_id, p_filters, p_alert_frequency)
  ON CONFLICT (user_id, filters)
  DO UPDATE SET alert_frequency = EXCLUDED.alert_frequency
  RETURNING id INTO saved_search_id;
  RETURN saved_search_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_saved_search_alert(
  p_id uuid,
  p_alert_frequency text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  updated_count integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_alert_frequency NOT IN ('DAILY', 'WEEKLY', 'NONE') THEN
    RAISE EXCEPTION 'Invalid alert frequency';
  END IF;

  UPDATE public.saved_searches
  SET alert_frequency = p_alert_frequency
  WHERE id = p_id AND user_id = current_user_id;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count = 0 THEN
    RAISE EXCEPTION 'Saved search not found';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_job_first_published_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.published_at := CASE WHEN NEW.status = 'ACTIVE' THEN now() ELSE NULL END;
  ELSIF OLD.published_at IS NOT NULL THEN
    NEW.published_at := OLD.published_at;
  ELSIF NEW.status = 'ACTIVE' THEN
    NEW.published_at := now();
  ELSE
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_application_first_responded_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'PENDING'
    AND NEW.status <> 'PENDING'
    AND NEW.status <> 'WITHDRAWN'
    AND OLD.first_responded_at IS NULL
  THEN
    NEW.first_responded_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_employer_response_rates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.companies AS company
  SET total_applications_90d = stats.total_applications,
      responded_applications_90d = stats.responded_applications,
      avg_response_hours = stats.avg_response_hours,
      response_rate_cached_at = now()
  FROM (
    SELECT
      c.id AS company_id,
      COUNT(a.id)::integer AS total_applications,
      COUNT(a.id) FILTER (WHERE a.status <> 'PENDING')::integer
        AS responded_applications,
      AVG(EXTRACT(EPOCH FROM (a.first_responded_at - a.applied_at)) / 3600)
        FILTER (
          WHERE a.status <> 'PENDING'
            AND a.first_responded_at IS NOT NULL
        ) AS avg_response_hours
    FROM public.companies AS c
    LEFT JOIN public.jobs AS j
      ON j.company_id = c.id AND j.status <> 'DRAFT'
    LEFT JOIN public.applications AS a
      ON a.job_id = j.id
      AND a.applied_at > now() - interval '90 days'
      AND a.status <> 'WITHDRAWN'
      AND NOT (
        a.status = 'PENDING'
        AND a.applied_at > now() - interval '7 days'
      )
      AND (
        j.source <> 'EXTERNAL'
        OR (j.claimed_at IS NOT NULL AND a.applied_at >= j.claimed_at)
      )
    GROUP BY c.id
  ) AS stats
  WHERE company.id = stats.company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_application_notification_details(
  p_application_id uuid
)
RETURNS TABLE (
  seeker_email text,
  job_title text,
  company_name text,
  employer_email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT seeker.email, j.title, c.company_name, employer.email
  FROM public.applications AS a
  JOIN public.users AS seeker ON seeker.id = a.seeker_id
  JOIN public.jobs AS j ON j.id = a.job_id
  JOIN public.companies AS c ON c.id = j.company_id
  JOIN public.users AS employer ON employer.id = c.employer_id
  WHERE a.id = p_application_id
    AND j.source <> 'EXTERNAL';
$$;

CREATE OR REPLACE FUNCTION public.create_sourced_job(
  p_admin_id uuid,
  p_title text,
  p_description text,
  p_location text,
  p_work_type text,
  p_category text,
  p_salary_min integer,
  p_salary_max integer,
  p_external_company_name text,
  p_source_url text,
  p_contact_email text,
  p_claim_token_hash text,
  p_duration_days integer DEFAULT 14
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
  v_job_id uuid;
  v_email text := lower(btrim(p_contact_email));
BEGIN
  IF nullif(btrim(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'Job title is required';
  END IF;
  IF p_work_type IS NULL OR p_work_type NOT IN ('REMOTE', 'ONSITE', 'HYBRID') THEN
    RAISE EXCEPTION 'Invalid work type';
  END IF;
  IF p_duration_days IS NULL OR p_duration_days NOT IN (7, 14, 30) THEN
    RAISE EXCEPTION 'Duration must be 7, 14, or 30 days';
  END IF;
  IF coalesce(p_source_url, '') !~* '^https://[^/?#[:space:]]+([/?#].*)?$' THEN
    RAISE EXCEPTION 'Source URL must be a valid HTTPS URL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Admin account not found';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.email_suppressions WHERE email = v_email
  ) THEN
    RAISE EXCEPTION 'This address has opted out of listing invitations';
  END IF;

  INSERT INTO public.companies (employer_id, company_name, is_system)
  VALUES (p_admin_id, 'Unclaimed (Sourced)', true)
  ON CONFLICT (employer_id) WHERE is_system = true DO NOTHING;
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE employer_id = p_admin_id AND is_system = true;

  INSERT INTO public.jobs (
    company_id, title, description, location, work_type, category,
    salary_min, salary_max, status, duration_days, price_lkr, expires_at,
    published_at, source, source_url, external_company_name
  )
  VALUES (
    v_company_id, btrim(p_title), p_description, p_location, p_work_type, p_category,
    p_salary_min, p_salary_max, 'ACTIVE', p_duration_days, 0,
    now() + (p_duration_days * interval '1 day'), now(), 'EXTERNAL',
    p_source_url, p_external_company_name
  )
  RETURNING id INTO v_job_id;

  INSERT INTO public.job_external_contacts (
    job_id, contact_email, claim_token_hash, claim_token_expires_at
  )
  VALUES (v_job_id, v_email, p_claim_token_hash, now() + interval '30 days');
  RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_application(
  p_seeker_id uuid,
  p_job_id uuid,
  p_cover_letter text,
  p_consent boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_resume_url text;
  v_application_id uuid;
  v_cover_letter text := nullif(btrim(p_cover_letter), '');
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_seeker_id::text, 0));
  IF p_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Consent is required';
  END IF;
  IF v_cover_letter IS NOT NULL AND char_length(v_cover_letter) > 3000 THEN
    RAISE EXCEPTION 'Cover letter must be 3000 characters or fewer';
  END IF;

  SELECT resume_url INTO v_resume_url
  FROM public.users
  WHERE id = p_seeker_id AND role = 'JOB_SEEKER';
  IF v_resume_url IS NULL THEN
    RAISE EXCEPTION 'Add a resume to your profile before applying';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.jobs WHERE id = p_job_id AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'This job is no longer accepting applications';
  END IF;
  IF (
    SELECT count(*) FROM public.applications
    WHERE seeker_id = p_seeker_id
      AND applied_at > now() - interval '24 hours'
  ) >= 20 THEN
    RAISE EXCEPTION 'You have reached the limit of 20 applications in 24 hours';
  END IF;

  INSERT INTO public.applications (
    job_id, seeker_id, resume_url, cover_letter, consent_at
  )
  VALUES (p_job_id, p_seeker_id, v_resume_url, v_cover_letter, now())
  RETURNING id INTO v_application_id;
  RETURN v_application_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_employer_job_publish_or_reprice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'ACTIVE' THEN
        RAISE EXCEPTION 'Employers cannot publish jobs without payment'
          USING errcode = '42501';
      END IF;
      IF NEW.duration_days IS DISTINCT FROM 14
        OR NEW.price_lkr IS DISTINCT FROM public.job_price_lkr(14)
        OR NEW.expires_at IS DISTINCT FROM
          transaction_timestamp() + interval '14 days'
        OR NEW.published_at IS NOT NULL
        OR NEW.last_verified_at IS NOT NULL
        OR NEW.applications_purge_at IS NOT NULL
        OR NEW.verification_token IS NOT NULL
        OR NEW.verification_sent_at IS NOT NULL
      THEN
        RAISE EXCEPTION 'Lifecycle and pricing fields are server-managed'
          USING errcode = '42501';
      END IF;
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF OLD.status IS DISTINCT FROM 'ACTIVE' AND NEW.status = 'ACTIVE' THEN
        RAISE EXCEPTION 'Employers cannot publish jobs without payment'
          USING errcode = '42501';
      END IF;
      IF NEW.price_lkr IS DISTINCT FROM OLD.price_lkr THEN
        RAISE EXCEPTION 'Employers cannot change a job price'
          USING errcode = '42501';
      END IF;
      IF NEW.expires_at IS DISTINCT FROM OLD.expires_at
        OR NEW.duration_days IS DISTINCT FROM OLD.duration_days
        OR NEW.published_at IS DISTINCT FROM OLD.published_at
        OR NEW.last_verified_at IS DISTINCT FROM OLD.last_verified_at
        OR NEW.applications_purge_at IS DISTINCT FROM OLD.applications_purge_at
        OR NEW.verification_token IS DISTINCT FROM OLD.verification_token
        OR NEW.verification_sent_at IS DISTINCT FROM OLD.verification_sent_at
      THEN
        RAISE EXCEPTION 'Job lifecycle fields are server-managed'
          USING errcode = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_employer_sourced_job_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF TG_OP = 'INSERT' AND (
      NEW.source IS DISTINCT FROM 'NATIVE'
      OR NEW.source_url IS NOT NULL
      OR NEW.external_company_name IS NOT NULL
      OR NEW.claimed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Only administrators can create sourced listings'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND (
      NEW.source IS DISTINCT FROM OLD.source
      OR NEW.source_url IS DISTINCT FROM OLD.source_url
      OR NEW.external_company_name IS DISTINCT FROM OLD.external_company_name
      OR NEW.claimed_at IS DISTINCT FROM OLD.claimed_at
    ) THEN
      RAISE EXCEPTION 'Sourced listing fields cannot be changed by employers'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_employer_system_company_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF TG_OP = 'INSERT' AND NEW.is_system THEN
      RAISE EXCEPTION 'System company records cannot be created by employers'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF OLD.is_system OR NEW.is_system
        OR NEW.is_system IS DISTINCT FROM OLD.is_system
      THEN
        RAISE EXCEPTION 'System company records cannot be changed by employers'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_external_jobs_to_notify(p_limit integer)
RETURNS TABLE (
  job_id uuid,
  title text,
  external_company_name text,
  contact_email text,
  notify_count integer,
  applicant_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    j.id,
    j.title,
    j.external_company_name,
    c.contact_email,
    c.notify_count,
    count(a.id)::bigint
  FROM public.jobs AS j
  JOIN public.job_external_contacts AS c ON c.job_id = j.id
  JOIN public.applications AS a
    ON a.job_id = j.id AND a.status <> 'WITHDRAWN'
  WHERE j.source = 'EXTERNAL'
    AND j.claimed_at IS NULL
    AND j.status = 'ACTIVE'
    AND c.notify_count < 3
    AND (
      c.last_notified_at IS NULL
      OR c.last_notified_at < now() - interval '24 hours'
    )
    AND (
      c.last_notified_at IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.applications AS recent
        WHERE recent.job_id = j.id
          AND recent.status <> 'WITHDRAWN'
          AND recent.applied_at > c.last_notified_at
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.email_suppressions AS s
      WHERE s.email = lower(c.contact_email)
    )
  GROUP BY
    j.id, j.title, j.external_company_name, j.created_at,
    c.contact_email, c.notify_count, c.last_notified_at
  ORDER BY c.last_notified_at NULLS FIRST, j.created_at
  LIMIT greatest(1, least(coalesce(p_limit, 25), 100));
$$;

CREATE OR REPLACE FUNCTION public.consume_free_job(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_used integer;
BEGIN
  SELECT free_jobs_used INTO v_used
  FROM public.companies
  WHERE id = p_company_id AND is_system = false
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer company not found';
  END IF;
  IF v_used >= public.free_jobs_per_employer() THEN
    RETURN false;
  END IF;
  UPDATE public.companies
  SET free_jobs_used = free_jobs_used + 1
  WHERE id = p_company_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_external_job(
  p_token_hash text,
  p_employer_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job_id uuid;
  v_external_company_name text;
  v_company_id uuid;
  v_duration_days integer;
  v_job_status text;
  v_free_claim boolean;
  v_claimed_at timestamptz := now();
  v_price_lkr integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_employer_id AND role = 'EMPLOYER'
  ) THEN
    RAISE EXCEPTION 'An employer account is required to claim this listing';
  END IF;

  SELECT contact.job_id INTO v_job_id
  FROM public.job_external_contacts AS contact
  WHERE contact.claim_token_hash = p_token_hash
    AND contact.claim_token_expires_at > v_claimed_at
  FOR UPDATE OF contact;
  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'This claim link is invalid, expired, or already used';
  END IF;

  SELECT job.external_company_name, job.duration_days, job.status
    INTO v_external_company_name, v_duration_days, v_job_status
  FROM public.jobs AS job
  WHERE job.id = v_job_id
    AND job.source = 'EXTERNAL'
    AND job.claimed_at IS NULL
    AND job.status IN ('ACTIVE', 'EXPIRED')
  FOR UPDATE OF job;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This claim link is invalid, expired, or already used';
  END IF;

  SELECT company.id INTO v_company_id
  FROM public.companies AS company
  WHERE company.employer_id = p_employer_id AND company.is_system = false
  LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (employer_id, company_name, is_verified)
    VALUES (
      p_employer_id,
      coalesce(nullif(btrim(v_external_company_name), ''), 'My Company'),
      false
    )
    ON CONFLICT (employer_id) WHERE is_system = false DO NOTHING;
    SELECT company.id INTO v_company_id
    FROM public.companies AS company
    WHERE company.employer_id = p_employer_id AND company.is_system = false
    LIMIT 1;
  END IF;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Could not load the employer company';
  END IF;

  v_price_lkr := public.job_price_lkr(v_duration_days);
  IF v_price_lkr IS NULL THEN
    RAISE EXCEPTION 'Unsupported job duration';
  END IF;

  IF v_job_status = 'ACTIVE' THEN
    v_free_claim := public.consume_free_job(v_company_id);
  ELSE
    v_free_claim := false;
  END IF;

  UPDATE public.jobs
  SET company_id = v_company_id,
      claimed_at = v_claimed_at,
      last_verified_at = CASE
        WHEN v_job_status = 'ACTIVE' THEN v_claimed_at
        ELSE last_verified_at
      END,
      expires_at = CASE
        WHEN v_job_status = 'ACTIVE'
          THEN v_claimed_at + make_interval(days => v_duration_days)
        ELSE expires_at
      END,
      applications_purge_at = CASE
        WHEN v_job_status = 'EXPIRED' THEN greatest(
          coalesce(applications_purge_at, '-infinity'::timestamptz),
          v_claimed_at + make_interval(days => v_duration_days)
        )
        ELSE applications_purge_at
      END,
      status = CASE
        WHEN v_job_status = 'EXPIRED' THEN 'EXPIRED'
        WHEN v_free_claim THEN 'ACTIVE'
        ELSE 'DRAFT'
      END,
      price_lkr = CASE
        WHEN v_job_status = 'EXPIRED' THEN price_lkr
        WHEN v_free_claim THEN 0
        ELSE v_price_lkr
      END,
      verification_token = NULL,
      verification_sent_at = NULL
  WHERE id = v_job_id
    AND claimed_at IS NULL
    AND status = v_job_status;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This listing has already been claimed';
  END IF;

  INSERT INTO public.claim_log (employer_id, job_id, claimed_at)
  VALUES (p_employer_id, v_job_id, v_claimed_at);
  DELETE FROM public.job_external_contacts WHERE job_id = v_job_id;
  RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_application_purge_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_retain_days integer;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status IN ('EXPIRED', 'CLOSED', 'FILLED', 'ARCHIVED') THEN
    v_retain_days := CASE
      WHEN NEW.source = 'EXTERNAL' AND NEW.claimed_at IS NULL THEN 30
      ELSE coalesce(NEW.duration_days, 14)
    END;
    NEW.applications_purge_at :=
      least(coalesce(NEW.expires_at, now()), now())
      + make_interval(days => v_retain_days);
  ELSIF NEW.status = 'ACTIVE' THEN
    NEW.applications_purge_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.anonymize_expired_applications(p_limit integer)
RETURNS TABLE(job_id uuid, anonymized integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'Batch limit must be a positive integer';
  END IF;
  RETURN QUERY
  WITH batch AS MATERIALIZED (
    SELECT job.id, job.source, job.claimed_at
    FROM public.jobs AS job
    WHERE job.applications_purge_at IS NOT NULL
      AND job.applications_purge_at <= now()
    ORDER BY job.applications_purge_at, job.id
    LIMIT p_limit
    FOR UPDATE OF job SKIP LOCKED
  ),
  anonymized_rows AS (
    UPDATE public.applications AS application
    SET cover_letter = NULL,
        resume_url = NULL,
        anonymized_at = now()
    WHERE application.anonymized_at IS NULL
      AND application.job_id IN (SELECT batch.id FROM batch)
    RETURNING application.job_id
  ),
  cleared_jobs AS (
    UPDATE public.jobs AS job
    SET applications_purge_at = NULL
    FROM batch
    WHERE job.id = batch.id
    RETURNING job.id
  ),
  removed_contacts AS (
    DELETE FROM public.job_external_contacts AS contact
    USING batch
    WHERE contact.job_id = batch.id
      AND batch.source = 'EXTERNAL'
      AND batch.claimed_at IS NULL
    RETURNING contact.job_id
  )
  SELECT batch.id, count(anonymized_rows.job_id)::integer
  FROM batch
  LEFT JOIN anonymized_rows ON anonymized_rows.job_id = batch.id
  GROUP BY batch.id
  ORDER BY batch.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_applications_purge_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated'
    AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.applications_purge_at IS DISTINCT FROM OLD.applications_purge_at
  THEN
    RAISE EXCEPTION 'Unauthorized to modify retention settings';
  END IF;
  -- Status transitions may legitimately receive applications_purge_at from
  -- set_application_purge_at; direct same-status employer edits remain blocked.
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS TABLE (
  deleted_unsubscribe_tokens integer,
  cleared_claim_tokens integer,
  cleared_milestone_tokens integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.email_unsubscribe_tokens
  WHERE expires_at <= now();
  GET DIAGNOSTICS deleted_unsubscribe_tokens = ROW_COUNT;

  UPDATE public.job_external_contacts
  SET claim_token_hash = NULL,
      claim_token_expires_at = NULL
  WHERE claim_token_expires_at <= now();
  GET DIAGNOSTICS cleared_claim_tokens = ROW_COUNT;

  UPDATE public.job_external_contacts
  SET milestone_token_hash = NULL,
      milestone_token_expires_at = NULL
  WHERE milestone_token_expires_at <= now();
  GET DIAGNOSTICS cleared_milestone_tokens = ROW_COUNT;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_milestone_action(
  p_token_hash text,
  p_action text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('still-hiring', 'filled') THEN
    RAISE EXCEPTION 'Invalid milestone action';
  END IF;

  SELECT contact.job_id INTO v_job_id
  FROM public.job_external_contacts AS contact
  WHERE contact.milestone_token_hash = p_token_hash
    AND contact.milestone_token_expires_at > now()
  FOR UPDATE OF contact;
  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'This response link is invalid, expired, or already used';
  END IF;

  PERFORM 1
  FROM public.jobs AS job
  WHERE job.id = v_job_id
    AND job.source = 'EXTERNAL'
    AND job.claimed_at IS NULL
    AND job.status = 'ACTIVE'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This listing is no longer available for a response';
  END IF;

  IF p_action = 'still-hiring' THEN
    UPDATE public.jobs
    SET last_verified_at = now()
    WHERE id = v_job_id;

    UPDATE public.job_external_contacts
    SET milestone_token_hash = NULL,
        milestone_token_expires_at = NULL
    WHERE job_id = v_job_id
      AND milestone_token_hash = p_token_hash;
  ELSE
    UPDATE public.jobs
    SET status = 'FILLED'
    WHERE id = v_job_id;

    DELETE FROM public.job_external_contacts
    WHERE job_id = v_job_id
      AND milestone_token_hash = p_token_hash;
  END IF;

  RETURN p_action;
END;
$$;

-- 7. Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS jobs_set_first_published_at ON public.jobs;
CREATE TRIGGER jobs_set_first_published_at
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_job_first_published_at();

DROP TRIGGER IF EXISTS applications_first_responded_at ON public.applications;
CREATE TRIGGER applications_first_responded_at
  BEFORE UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_application_first_responded_at();

DROP TRIGGER IF EXISTS prevent_employer_job_publish_or_reprice ON public.jobs;
DROP TRIGGER IF EXISTS a_prevent_employer_job_publish_or_reprice ON public.jobs;
CREATE TRIGGER a_prevent_employer_job_publish_or_reprice
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_employer_job_publish_or_reprice();

DROP TRIGGER IF EXISTS prevent_employer_sourced_job_changes ON public.jobs;
CREATE TRIGGER prevent_employer_sourced_job_changes
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_employer_sourced_job_changes();

DROP TRIGGER IF EXISTS prevent_employer_system_company_changes ON public.companies;
CREATE TRIGGER prevent_employer_system_company_changes
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.prevent_employer_system_company_changes();

DROP TRIGGER IF EXISTS trg_set_application_purge_on_jobs ON public.jobs;
CREATE TRIGGER trg_set_application_purge_on_jobs
  BEFORE UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_application_purge_at();

DROP TRIGGER IF EXISTS trg_protect_applications_purge_at ON public.jobs;
CREATE TRIGGER trg_protect_applications_purge_at
  BEFORE UPDATE OF applications_purge_at ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.protect_applications_purge_at();

-- 8. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_external_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_log ENABLE ROW LEVEL SECURITY;

-- 9. RLS policies
DROP POLICY IF EXISTS "users_select_self" ON public.users;
CREATE POLICY "users_select_self" ON public.users
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_employer_read_applicants" ON public.users;
CREATE POLICY "users_employer_read_applicants" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.applications AS a
      JOIN public.jobs AS j ON j.id = a.job_id
      JOIN public.companies AS c ON c.id = j.company_id
      WHERE a.seeker_id = users.id
        AND c.employer_id = auth.uid()
        -- Intentionally hide applicants after their personal data is anonymized.
        AND a.anonymized_at IS NULL
    )
  );

DROP POLICY IF EXISTS "companies_public_read" ON public.companies;
CREATE POLICY "companies_public_read" ON public.companies
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "companies_employer_write" ON public.companies;
CREATE POLICY "companies_employer_write" ON public.companies
  FOR ALL USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "jobs_public_read_active" ON public.jobs;
CREATE POLICY "jobs_public_read_active" ON public.jobs
  FOR SELECT USING (status = 'ACTIVE');
DROP POLICY IF EXISTS "jobs_employer_read_own" ON public.jobs;
CREATE POLICY "jobs_employer_read_own" ON public.jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.companies AS c
      WHERE c.id = jobs.company_id AND c.employer_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "jobs_employer_write_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_employer_insert_own" ON public.jobs;
CREATE POLICY "jobs_employer_insert_own" ON public.jobs
  FOR INSERT WITH CHECK (
    status <> 'ACTIVE'
    AND EXISTS (
      SELECT 1 FROM public.companies AS c
      WHERE c.id = jobs.company_id AND c.employer_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "jobs_employer_update_own" ON public.jobs;
CREATE POLICY "jobs_employer_update_own" ON public.jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.companies AS c
      WHERE c.id = jobs.company_id AND c.employer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies AS c
      WHERE c.id = jobs.company_id AND c.employer_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "jobs_employer_delete_own" ON public.jobs;
CREATE POLICY "jobs_employer_delete_own" ON public.jobs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.companies AS c
      WHERE c.id = jobs.company_id AND c.employer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "applications_seeker_own" ON public.applications;
DROP POLICY IF EXISTS "applications_seeker_select_own" ON public.applications;
CREATE POLICY "applications_seeker_select_own" ON public.applications
  FOR SELECT USING (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "applications_seeker_insert_own" ON public.applications;
CREATE POLICY "applications_seeker_insert_own" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = seeker_id AND status = 'PENDING');
DROP POLICY IF EXISTS "applications_seeker_delete_own" ON public.applications;
CREATE POLICY "applications_seeker_delete_own" ON public.applications
  FOR DELETE USING (auth.uid() = seeker_id);
DROP POLICY IF EXISTS "applications_employer_read" ON public.applications;
CREATE POLICY "applications_employer_read" ON public.applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.jobs AS j
      JOIN public.companies AS c ON c.id = j.company_id
      -- No status filter: employers retain access to applicants after claiming an expired listing.
      WHERE j.id = applications.job_id AND c.employer_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "applications_employer_update" ON public.applications;
CREATE POLICY "applications_employer_update" ON public.applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs AS j
      JOIN public.companies AS c ON c.id = j.company_id
      WHERE j.id = applications.job_id AND c.employer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.jobs AS j
      JOIN public.companies AS c ON c.id = j.company_id
      WHERE j.id = applications.job_id AND c.employer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payments_user_read_own" ON public.payments;
CREATE POLICY "payments_user_read_own" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "payments_user_insert_own" ON public.payments;
CREATE POLICY "payments_user_insert_own" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_searches_select_own" ON public.saved_searches;
CREATE POLICY "saved_searches_select_own" ON public.saved_searches
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_searches_insert_own" ON public.saved_searches;
CREATE POLICY "saved_searches_insert_own" ON public.saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_searches_update_own" ON public.saved_searches;
CREATE POLICY "saved_searches_update_own" ON public.saved_searches
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_searches_delete_own" ON public.saved_searches;
CREATE POLICY "saved_searches_delete_own" ON public.saved_searches
  FOR DELETE USING (auth.uid() = user_id);

-- 10. Grants and revokes
REVOKE ALL ON TABLE public.job_external_contacts,
  public.email_suppressions,
  public.email_unsubscribe_tokens
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.job_external_contacts,
  public.email_suppressions,
  public.email_unsubscribe_tokens
  TO service_role;

REVOKE ALL ON TABLE public.claim_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.claim_log TO service_role;
REVOKE INSERT ON TABLE public.applications FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.calculate_employer_response_rates()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_employer_response_rates()
  TO service_role;
REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user()
  TO service_role;
REVOKE ALL ON FUNCTION public.save_saved_search(jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_saved_search(jsonb, text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.set_saved_search_alert(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_saved_search_alert(uuid, text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.job_price_lkr(integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.job_price_lkr(integer)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.free_jobs_per_employer()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.free_jobs_per_employer()
  TO service_role;
REVOKE ALL ON FUNCTION public.set_job_first_published_at()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_job_first_published_at()
  TO service_role;
REVOKE ALL ON FUNCTION public.set_application_first_responded_at()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_application_first_responded_at()
  TO service_role;
REVOKE ALL ON FUNCTION public.prevent_employer_job_publish_or_reprice()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_employer_job_publish_or_reprice()
  TO service_role;
REVOKE ALL ON FUNCTION public.prevent_employer_sourced_job_changes()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_employer_sourced_job_changes()
  TO service_role;
REVOKE ALL ON FUNCTION public.prevent_employer_system_company_changes()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_employer_system_company_changes()
  TO service_role;
REVOKE ALL ON FUNCTION public.set_application_purge_at()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_application_purge_at()
  TO service_role;
REVOKE ALL ON FUNCTION public.protect_applications_purge_at()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_applications_purge_at()
  TO service_role;
REVOKE ALL ON FUNCTION public.create_sourced_job(
  uuid, text, text, text, text, text, integer, integer, text, text, text, text, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_sourced_job(
  uuid, text, text, text, text, text, integer, integer, text, text, text, text, integer
) TO service_role;
REVOKE ALL ON FUNCTION public.submit_application(uuid, uuid, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_application(uuid, uuid, text, boolean)
  TO service_role;
REVOKE ALL ON FUNCTION public.get_external_jobs_to_notify(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_external_jobs_to_notify(integer)
  TO service_role;
REVOKE ALL ON FUNCTION public.consume_free_job(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_free_job(uuid)
  TO service_role;
REVOKE ALL ON FUNCTION public.claim_external_job(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_external_job(text, uuid)
  TO service_role;
REVOKE ALL ON FUNCTION public.anonymize_expired_applications(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_expired_applications(integer)
  TO service_role;
REVOKE ALL ON FUNCTION public.get_application_notification_details(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_application_notification_details(uuid)
  TO service_role;
REVOKE ALL ON FUNCTION public.cleanup_expired_tokens()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_tokens()
  TO service_role;
REVOKE ALL ON FUNCTION public.consume_milestone_action(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_milestone_action(text, text)
  TO service_role;
