-- Sourced listings and private employer-claim metadata.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'NATIVE',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS external_company_name text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.jobs'::regclass
      AND conname = 'jobs_source_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_source_check
      CHECK (source IN ('NATIVE', 'EXTERNAL'));
  END IF;
END;
$$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_employer_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS companies_employer_id_non_system_key
  ON public.companies(employer_id)
  WHERE is_system = false;

CREATE UNIQUE INDEX IF NOT EXISTS companies_employer_id_system_key
  ON public.companies(employer_id)
  WHERE is_system = true;

-- A migration runner may set app.admin_email to create the holder immediately.
-- The sourced-job RPC also creates it atomically on first use when this setting
-- is unavailable to the migration runner.
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM public.users
  WHERE lower(email) = lower(nullif(current_setting('app.admin_email', true), ''))
  LIMIT 1;

  IF v_admin_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.companies
    WHERE employer_id = v_admin_id AND is_system
  ) THEN
    INSERT INTO public.companies (employer_id, company_name, is_system)
    VALUES (v_admin_id, 'Unclaimed (Sourced)', true);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.job_external_contacts (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  contact_email text NOT NULL,
  claim_token_hash text UNIQUE,
  claim_token_expires_at timestamptz,
  notify_count integer NOT NULL DEFAULT 0,
  last_notified_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email text PRIMARY KEY CHECK (email = lower(email)),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.job_external_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.job_external_contacts,
  public.email_suppressions,
  public.email_unsubscribe_tokens
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.job_external_contacts,
  public.email_suppressions,
  public.email_unsubscribe_tokens
  TO service_role;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS cover_letter text,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.applications'::regclass
      AND conname = 'applications_cover_letter_length_check'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_cover_letter_length_check
      CHECK (cover_letter IS NULL OR char_length(cover_letter) <= 3000);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS job_external_contacts_notify_idx
  ON public.job_external_contacts(last_notified_at, notify_count);

CREATE INDEX IF NOT EXISTS idx_applications_seeker_applied
  ON public.applications(seeker_id, applied_at);

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
  p_claim_token_hash text
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
  IF coalesce(p_source_url, '') !~* '^https://[^/?#[:space:]]+([/?#].*)?$' THEN
    RAISE EXCEPTION 'Source URL must be a valid HTTPS URL';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Admin account not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.email_suppressions WHERE email = v_email) THEN
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
    p_salary_min, p_salary_max, 'ACTIVE', 14, 0, now() + interval '14 days',
    now(), 'EXTERNAL', p_source_url, p_external_company_name
  )
  RETURNING id INTO v_job_id;

  INSERT INTO public.job_external_contacts (
    job_id, contact_email, claim_token_hash, claim_token_expires_at
  )
  VALUES (v_job_id, v_email, p_claim_token_hash, now() + interval '30 days');

  RETURN v_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_sourced_job(
  uuid, text, text, text, text, text, integer, integer, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_sourced_job(
  uuid, text, text, text, text, text, integer, integer, text, text, text, text
) TO service_role;

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
    SELECT 1 FROM public.jobs
    WHERE id = p_job_id AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'This job is no longer accepting applications';
  END IF;

  IF (SELECT count(*) FROM public.applications
      WHERE seeker_id = p_seeker_id
        AND applied_at > now() - interval '24 hours') >= 20 THEN
    RAISE EXCEPTION 'You have reached the limit of 20 applications in 24 hours';
  END IF;

  INSERT INTO public.applications (
    job_id, seeker_id, resume_url, cover_letter, consent_at
  )
  VALUES (
    p_job_id, p_seeker_id, v_resume_url, v_cover_letter, now()
  )
  RETURNING id INTO v_application_id;

  RETURN v_application_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_application(uuid, uuid, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_application(uuid, uuid, text, boolean)
  TO service_role;
REVOKE INSERT ON TABLE public.applications FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_employer_sourced_job_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF TG_OP = 'INSERT' AND NEW.source <> 'NATIVE' THEN
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

DROP TRIGGER IF EXISTS prevent_employer_sourced_job_changes ON public.jobs;
CREATE TRIGGER prevent_employer_sourced_job_changes
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_employer_sourced_job_changes();

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

DROP TRIGGER IF EXISTS prevent_employer_system_company_changes ON public.companies;
CREATE TRIGGER prevent_employer_system_company_changes
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_employer_system_company_changes();

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
  JOIN public.applications AS a ON a.job_id = j.id AND a.status <> 'WITHDRAWN'
  WHERE j.source = 'EXTERNAL'
    AND j.claimed_at IS NULL
    AND j.status = 'ACTIVE'
    AND c.notify_count < 3
    AND (c.last_notified_at IS NULL OR c.last_notified_at < now() - interval '24 hours')
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

REVOKE ALL ON FUNCTION public.get_external_jobs_to_notify(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_external_jobs_to_notify(integer)
  TO service_role;

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
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_employer_id AND role = 'EMPLOYER'
  ) THEN
    RAISE EXCEPTION 'An employer account is required to claim this listing';
  END IF;

  SELECT contact.job_id
    INTO v_job_id
  FROM public.job_external_contacts AS contact
  WHERE contact.claim_token_hash = p_token_hash
    AND contact.claim_token_expires_at > now()
  FOR UPDATE OF contact;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'This claim link is invalid, expired, or already used';
  END IF;

  SELECT j.external_company_name
    INTO v_external_company_name
  FROM public.jobs AS j
  WHERE j.id = v_job_id
    AND j.source = 'EXTERNAL'
    AND j.claimed_at IS NULL
    AND j.status = 'ACTIVE'
  FOR UPDATE OF j;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This claim link is invalid, expired, or already used';
  END IF;

  SELECT id INTO v_company_id
  FROM public.companies
  WHERE employer_id = p_employer_id AND is_system = false
  LIMIT 1;

  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (employer_id, company_name, is_verified)
    VALUES (
      p_employer_id,
      coalesce(nullif(btrim(v_external_company_name), ''), 'My Company'),
      false
    )
    ON CONFLICT (employer_id) WHERE is_system = false DO NOTHING;

    SELECT id INTO v_company_id
    FROM public.companies
    WHERE employer_id = p_employer_id AND is_system = false
    LIMIT 1;
  END IF;

  UPDATE public.jobs
  SET company_id = v_company_id,
      claimed_at = now(),
      last_verified_at = now(),
      expires_at = now() + make_interval(days => duration_days),
      verification_token = NULL,
      verification_sent_at = NULL
  WHERE id = v_job_id
    AND claimed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This listing has already been claimed';
  END IF;

  DELETE FROM public.job_external_contacts WHERE job_id = v_job_id;
  RETURN v_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_external_job(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_external_job(text, uuid)
  TO service_role;

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
    AND a.seeker_id = (SELECT auth.uid())
    AND j.source <> 'EXTERNAL';
$$;

REVOKE ALL ON FUNCTION public.get_application_notification_details(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_application_notification_details(uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.calculate_employer_response_rates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      ON j.company_id = c.id
      AND j.status <> 'DRAFT'
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
        OR (
          j.claimed_at IS NOT NULL
          AND a.applied_at >= j.claimed_at
        )
      )
    GROUP BY c.id
  ) AS stats
  WHERE company.id = stats.company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_employer_response_rates()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_employer_response_rates()
  TO service_role;
