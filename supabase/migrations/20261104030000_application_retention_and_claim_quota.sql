-- Free sourced-job claims and application-data retention.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS free_jobs_used integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.companies'::regclass
      AND conname = 'companies_free_jobs_used_check'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_free_jobs_used_check
      CHECK (free_jobs_used >= 0);
  END IF;
END;
$$;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS applications_purge_at timestamptz;

ALTER TABLE public.applications
  ALTER COLUMN resume_url DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

CREATE INDEX IF NOT EXISTS jobs_applications_purge_at_idx
  ON public.jobs (applications_purge_at)
  WHERE applications_purge_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.claim_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claim_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.claim_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.claim_log TO service_role;

CREATE OR REPLACE FUNCTION public.consume_free_job(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_used integer;
BEGIN
  SELECT free_jobs_used
    INTO v_used
  FROM public.companies
  WHERE id = p_company_id
    AND is_system = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer company not found';
  END IF;

  IF v_used >= 2 THEN
    RETURN false;
  END IF;

  UPDATE public.companies
  SET free_jobs_used = free_jobs_used + 1
  WHERE id = p_company_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_free_job(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_free_job(uuid)
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
  v_duration_days integer;
  v_free_claim boolean;
  v_claimed_at timestamptz := now();
  v_price_lkr integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = p_employer_id
      AND role = 'EMPLOYER'
  ) THEN
    RAISE EXCEPTION 'An employer account is required to claim this listing';
  END IF;

  SELECT contact.job_id
    INTO v_job_id
  FROM public.job_external_contacts AS contact
  WHERE contact.claim_token_hash = p_token_hash
    AND contact.claim_token_expires_at > v_claimed_at
  FOR UPDATE OF contact;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'This claim link is invalid, expired, or already used';
  END IF;

  SELECT job.external_company_name, job.duration_days
    INTO v_external_company_name, v_duration_days
  FROM public.jobs AS job
  WHERE job.id = v_job_id
    AND job.source = 'EXTERNAL'
    AND job.claimed_at IS NULL
    AND job.status = 'ACTIVE'
  FOR UPDATE OF job;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This claim link is invalid, expired, or already used';
  END IF;

  SELECT company.id
    INTO v_company_id
  FROM public.companies AS company
  WHERE company.employer_id = p_employer_id
    AND company.is_system = false
  LIMIT 1;

  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (employer_id, company_name, is_verified)
    VALUES (
      p_employer_id,
      coalesce(nullif(btrim(v_external_company_name), ''), 'My Company'),
      false
    )
    ON CONFLICT (employer_id) WHERE is_system = false DO NOTHING;

    SELECT company.id
      INTO v_company_id
    FROM public.companies AS company
    WHERE company.employer_id = p_employer_id
      AND company.is_system = false
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Could not load the employer company';
  END IF;

  v_free_claim := public.consume_free_job(v_company_id);
  v_price_lkr := CASE v_duration_days
    WHEN 7 THEN 2499
    WHEN 14 THEN 4499
    WHEN 30 THEN 8499
    ELSE NULL
  END;

  IF v_price_lkr IS NULL THEN
    RAISE EXCEPTION 'Unsupported job duration';
  END IF;

  UPDATE public.jobs
  SET company_id = v_company_id,
      claimed_at = v_claimed_at,
      last_verified_at = v_claimed_at,
      expires_at = v_claimed_at + make_interval(days => v_duration_days),
      status = CASE WHEN v_free_claim THEN 'ACTIVE' ELSE 'DRAFT' END,
      price_lkr = CASE WHEN v_free_claim THEN 0 ELSE v_price_lkr END,
      verification_token = NULL,
      verification_sent_at = NULL
  WHERE id = v_job_id
    AND claimed_at IS NULL
    AND status = 'ACTIVE';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This listing has already been claimed';
  END IF;

  INSERT INTO public.claim_log (employer_id, job_id, claimed_at)
  VALUES (p_employer_id, v_job_id, v_claimed_at);

  DELETE FROM public.job_external_contacts
  WHERE job_id = v_job_id;

  RETURN v_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_external_job(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_external_job(text, uuid)
  TO service_role;

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

DROP TRIGGER IF EXISTS trg_set_application_purge_on_jobs ON public.jobs;
CREATE TRIGGER trg_set_application_purge_on_jobs
  BEFORE UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_application_purge_at();

CREATE OR REPLACE FUNCTION public.anonymize_expired_applications(p_limit integer)
RETURNS TABLE(job_id uuid, anonymized integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job record;
  v_updated_count integer;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'Batch limit must be a positive integer';
  END IF;

  FOR v_job IN
    SELECT job.id, job.source, job.claimed_at
    FROM public.jobs AS job
    WHERE job.applications_purge_at IS NOT NULL
      AND job.applications_purge_at <= now()
    ORDER BY job.applications_purge_at, job.id
    LIMIT p_limit
    FOR UPDATE OF job SKIP LOCKED
  LOOP
    UPDATE public.applications AS application
    SET cover_letter = NULL,
        resume_url = NULL,
        anonymized_at = now()
    WHERE application.job_id = v_job.id
      AND application.anonymized_at IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    UPDATE public.jobs AS job
    SET applications_purge_at = NULL
    WHERE job.id = v_job.id;

    IF v_job.source = 'EXTERNAL' AND v_job.claimed_at IS NULL THEN
      DELETE FROM public.job_external_contacts AS contact
      WHERE contact.job_id = v_job.id;
    END IF;

    job_id := v_job.id;
    anonymized := v_updated_count;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_expired_applications(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_expired_applications(integer)
  TO service_role;
