BEGIN;

-- Existing security-sensitive functions use only explicitly-qualified objects.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.save_saved_search(jsonb, text) SET search_path = '';
ALTER FUNCTION public.set_saved_search_alert(uuid, text) SET search_path = '';
ALTER FUNCTION public.set_job_first_published_at() SET search_path = '';
ALTER FUNCTION public.set_application_first_responded_at() SET search_path = '';
ALTER FUNCTION public.calculate_employer_response_rates() SET search_path = '';

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
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '14 days'),
  ALTER COLUMN price_lkr SET DEFAULT public.job_price_lkr(14);

UPDATE public.companies
SET free_jobs_used = least(greatest(free_jobs_used, 0), 2)
WHERE free_jobs_used < 0 OR free_jobs_used > 2;
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_free_jobs_used_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_free_jobs_used_check
  CHECK (free_jobs_used BETWEEN 0 AND 2);

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

DROP TRIGGER IF EXISTS prevent_employer_job_publish_or_reprice ON public.jobs;
DROP TRIGGER IF EXISTS a_prevent_employer_job_publish_or_reprice ON public.jobs;
CREATE TRIGGER a_prevent_employer_job_publish_or_reprice
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_employer_job_publish_or_reprice();

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

REVOKE ALL ON FUNCTION public.job_price_lkr(integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.job_price_lkr(integer)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.free_jobs_per_employer()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.free_jobs_per_employer()
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
REVOKE ALL ON FUNCTION public.calculate_employer_response_rates()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_employer_response_rates()
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
REVOKE ALL ON FUNCTION public.cleanup_expired_tokens()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_tokens()
  TO service_role;
REVOKE ALL ON FUNCTION public.consume_milestone_action(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_milestone_action(text, text)
  TO service_role;
REVOKE ALL ON FUNCTION public.get_application_notification_details(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_application_notification_details(uuid)
  TO service_role;

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

COMMIT;
