-- Run against a disposable Supabase database after all migrations are applied.
-- The transaction rolls back every fixture. Do not run against production.
BEGIN;

CREATE TEMP TABLE hardening_test_ids (
  employer_id uuid,
  seeker_id uuid,
  company_id uuid,
  system_company_id uuid,
  draft_job_id uuid,
  filled_job_id uuid,
  active_external_job_id uuid,
  expired_external_job_id uuid,
  anonymize_job_id uuid,
  cleanup_job_id uuid,
  still_hiring_job_id uuid,
  filled_milestone_job_id uuid,
  active_claim_hash text,
  expired_claim_hash text,
  expired_unsubscribe_hash text,
  valid_unsubscribe_hash text,
  expired_contact_claim_hash text,
  valid_contact_claim_hash text,
  expired_milestone_hash text,
  valid_milestone_hash text,
  still_hiring_hash text,
  filled_milestone_hash text
);

INSERT INTO hardening_test_ids
SELECT
  extensions.gen_random_uuid(),
  extensions.gen_random_uuid(),
  extensions.gen_random_uuid(),
  extensions.gen_random_uuid(),
  extensions.gen_random_uuid(),
  extensions.gen_random_uuid(),
  extensions.gen_random_uuid(),
  extensions.gen_random_uuid(),
  extensions.gen_random_uuid(),
  extensions.gen_random_uuid(),
  extensions.gen_random_uuid(),
  extensions.gen_random_uuid(),
  encode(extensions.gen_random_bytes(32), 'hex'),
  encode(extensions.gen_random_bytes(32), 'hex'),
  encode(extensions.gen_random_bytes(32), 'hex'),
  encode(extensions.gen_random_bytes(32), 'hex'),
  encode(extensions.gen_random_bytes(32), 'hex'),
  encode(extensions.gen_random_bytes(32), 'hex'),
  encode(extensions.gen_random_bytes(32), 'hex'),
  encode(extensions.gen_random_bytes(32), 'hex'),
  encode(extensions.gen_random_bytes(32), 'hex'),
  encode(extensions.gen_random_bytes(32), 'hex');

GRANT SELECT ON hardening_test_ids TO authenticated, service_role;

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
)
SELECT employer_id, 'authenticated', 'authenticated',
       'hardening-employer-' || employer_id::text || '@example.test',
       '', now(), '{}'::jsonb, '{"role":"EMPLOYER"}'::jsonb
FROM hardening_test_ids
UNION ALL
SELECT seeker_id, 'authenticated', 'authenticated',
       'hardening-seeker-' || seeker_id::text || '@example.test',
       '', now(), '{}'::jsonb, '{"role":"JOB_SEEKER"}'::jsonb
FROM hardening_test_ids;

INSERT INTO public.companies (id, employer_id, company_name, is_system)
SELECT company_id, employer_id, 'Hardening test employer', false
FROM hardening_test_ids;
INSERT INTO public.companies (id, employer_id, company_name, is_system)
SELECT system_company_id, employer_id, 'Hardening test source', true
FROM hardening_test_ids;

INSERT INTO public.jobs (
  id, company_id, title, description, location, work_type, status,
  duration_days, expires_at, price_lkr
)
SELECT draft_job_id, company_id, 'Hardening draft', 'Original description',
       'Colombo', 'ONSITE', 'DRAFT', 14, now() + interval '14 days', 4499
FROM hardening_test_ids;

INSERT INTO public.jobs (
  id, company_id, title, description, location, work_type, status,
  duration_days, expires_at, price_lkr
)
SELECT filled_job_id, company_id, 'Hardening fill flow', 'Original description',
       'Colombo', 'ONSITE', 'ACTIVE', 14, now() + interval '14 days', 4499
FROM hardening_test_ids;

INSERT INTO public.jobs (
  id, company_id, title, description, location, work_type, status,
  duration_days, expires_at, price_lkr, source, source_url,
  external_company_name
)
SELECT active_external_job_id, system_company_id, 'Active claim', 'Description',
       'Colombo', 'REMOTE', 'ACTIVE', 7, now() + interval '7 days', 0,
       'EXTERNAL', 'https://example.test/active', 'Source employer'
FROM hardening_test_ids;

INSERT INTO public.jobs (
  id, company_id, title, description, location, work_type, status,
  duration_days, expires_at, price_lkr, source, source_url,
  external_company_name, applications_purge_at
)
SELECT expired_external_job_id, system_company_id, 'Expired claim', 'Description',
       'Colombo', 'REMOTE', 'EXPIRED', 14, now() - interval '30 days', 0,
       'EXTERNAL', 'https://example.test/expired', 'Source employer',
       now() - interval '1 day'
FROM hardening_test_ids;

INSERT INTO public.jobs (
  id, company_id, title, description, location, work_type, status,
  duration_days, expires_at, price_lkr, applications_purge_at
)
SELECT anonymize_job_id, company_id, 'Anonymize test', 'Description',
       'Colombo', 'ONSITE', 'FILLED', 14, now() - interval '30 days', 4499,
       now() - interval '1 minute'
FROM hardening_test_ids;

INSERT INTO public.jobs (
  id, company_id, title, description, location, work_type, status,
  duration_days, expires_at, price_lkr, source, source_url,
  external_company_name
)
SELECT cleanup_job_id, system_company_id, 'Token cleanup test', 'Description',
       'Colombo', 'REMOTE', 'EXPIRED', 14, now() - interval '30 days', 0,
       'EXTERNAL', 'https://example.test/tokens', 'Source employer'
FROM hardening_test_ids;

INSERT INTO public.jobs (
  id, company_id, title, description, location, work_type, status,
  duration_days, expires_at, price_lkr, source, source_url,
  external_company_name
)
SELECT still_hiring_job_id, system_company_id, 'Still hiring milestone', 'Description',
       'Colombo', 'REMOTE', 'ACTIVE', 14, now() + interval '14 days', 0,
       'EXTERNAL', 'https://example.test/still-hiring', 'Source employer'
FROM hardening_test_ids
UNION ALL
SELECT filled_milestone_job_id, system_company_id, 'Filled milestone', 'Description',
       'Colombo', 'REMOTE', 'ACTIVE', 14, now() + interval '14 days', 0,
       'EXTERNAL', 'https://example.test/filled', 'Source employer'
FROM hardening_test_ids;

INSERT INTO public.job_external_contacts (
  job_id, contact_email, claim_token_hash, claim_token_expires_at
)
SELECT active_external_job_id, 'active@example.test', active_claim_hash,
       now() + interval '1 day'
FROM hardening_test_ids
UNION ALL
SELECT expired_external_job_id, 'expired@example.test', expired_claim_hash,
       now() + interval '1 day'
FROM hardening_test_ids;

INSERT INTO public.job_external_contacts (
  job_id, contact_email, milestone_token_hash, milestone_token_expires_at
)
SELECT still_hiring_job_id, 'still-hiring@example.test',
       still_hiring_hash, now() + interval '1 day'
FROM hardening_test_ids
UNION ALL
SELECT filled_milestone_job_id, 'filled-milestone@example.test',
       filled_milestone_hash, now() + interval '1 day'
FROM hardening_test_ids;

INSERT INTO public.applications (
  job_id, seeker_id, resume_url, cover_letter, status, applied_at, first_responded_at
)
SELECT expired_external_job_id, seeker_id, 'https://example.test/resume.pdf',
       'Reviewable application', 'REVIEWED', now() - interval '2 days',
       now() - interval '1 day'
FROM hardening_test_ids
UNION ALL
SELECT filled_job_id, seeker_id, 'https://example.test/filled.pdf',
       'Filled-flow application', 'PENDING', now() - interval '1 day', NULL
FROM hardening_test_ids
UNION ALL
SELECT anonymize_job_id, seeker_id, 'https://example.test/anonymize.pdf',
       'Must be removed', 'SHORTLISTED', now() - interval '10 days',
       now() - interval '9 days'
FROM hardening_test_ids;

INSERT INTO public.job_external_contacts (
  job_id, contact_email, claim_token_hash, claim_token_expires_at,
  milestone_token_hash, milestone_token_expires_at
)
SELECT cleanup_job_id, 'expired-tokens@example.test',
       expired_contact_claim_hash, now() - interval '1 hour',
       expired_milestone_hash, now() - interval '1 hour'
FROM hardening_test_ids;
INSERT INTO public.email_unsubscribe_tokens (token_hash, email, expires_at)
SELECT expired_unsubscribe_hash, 'expired@example.test', now() - interval '1 hour'
FROM hardening_test_ids
UNION ALL
SELECT valid_unsubscribe_hash, 'valid@example.test', now() + interval '1 day'
FROM hardening_test_ids;

INSERT INTO public.job_external_contacts (
  job_id, contact_email, claim_token_hash, claim_token_expires_at,
  milestone_token_hash, milestone_token_expires_at
)
SELECT anonymize_job_id, 'valid-tokens@example.test',
       valid_contact_claim_hash, now() + interval '1 day',
       valid_milestone_hash, now() + interval '1 day'
FROM hardening_test_ids;

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.job_external_contacts', 'SELECT')
    OR has_table_privilege('anon', 'public.claim_log', 'SELECT')
    OR has_table_privilege('anon', 'public.email_suppressions', 'SELECT')
    OR has_table_privilege('anon', 'public.email_unsubscribe_tokens', 'SELECT')
  THEN
    RAISE EXCEPTION 'anon unexpectedly has SELECT access to private tables';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT employer_id::text FROM hardening_test_ids),
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  ids hardening_test_ids%ROWTYPE;
  actual_status text;
  actual_title text;
  actual_description text;
  actual_purge_at timestamptz;
  expected_purge_at timestamptz;
  actual_applicants integer;
BEGIN
  SELECT * INTO ids FROM pg_temp.hardening_test_ids;

  BEGIN
    UPDATE public.jobs SET expires_at = now() + interval '90 days'
    WHERE id = ids.draft_job_id;
    RAISE EXCEPTION 'expires_at update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.jobs SET duration_days = 30 WHERE id = ids.draft_job_id;
    RAISE EXCEPTION 'duration_days update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.jobs SET published_at = now() WHERE id = ids.draft_job_id;
    RAISE EXCEPTION 'published_at update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.jobs SET price_lkr = 1 WHERE id = ids.draft_job_id;
    RAISE EXCEPTION 'price_lkr update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.jobs SET applications_purge_at = now() + interval '1 day'
    WHERE id = ids.draft_job_id;
    RAISE EXCEPTION 'applications_purge_at update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.jobs SET last_verified_at = now() WHERE id = ids.draft_job_id;
    RAISE EXCEPTION 'last_verified_at update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.jobs SET source_url = 'https://example.test/forged'
    WHERE id = ids.draft_job_id;
    RAISE EXCEPTION 'source_url update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.jobs SET status = 'ACTIVE' WHERE id = ids.draft_job_id;
    RAISE EXCEPTION 'employer activation unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.jobs (
      company_id, title, description, location, work_type,
      expires_at, price_lkr, duration_days
    )
    VALUES (
      ids.company_id, 'Forged expiry', 'Description', 'Colombo', 'ONSITE',
      now() + interval '90 days', 4499, 14
    );
    RAISE EXCEPTION 'employer insert with forged expiry unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.jobs
  SET title = 'Updated title', description = 'Updated description'
  WHERE id = ids.filled_job_id;
  UPDATE public.jobs SET status = 'FILLED' WHERE id = ids.filled_job_id;

  SELECT status, applications_purge_at, title, description
    INTO actual_status, actual_purge_at, actual_title, actual_description
  FROM public.jobs
  WHERE id = ids.filled_job_id;
  SELECT least(expires_at, now()) + make_interval(days => duration_days)
    INTO expected_purge_at
  FROM public.jobs
  WHERE id = ids.filled_job_id;
  IF actual_status <> 'FILLED'
    OR actual_title <> 'Updated title'
    OR actual_description <> 'Updated description'
    OR actual_purge_at IS DISTINCT FROM expected_purge_at
  THEN
    RAISE EXCEPTION 'Employer mark-filled flow did not set a retention window';
  END IF;

  BEGIN
    UPDATE public.jobs
    SET applications_purge_at = now() + interval '90 days'
    WHERE id = ids.filled_job_id;
    RAISE EXCEPTION 'direct retention edit unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.companies SET free_jobs_used = 3
    WHERE id = ids.company_id;
    RAISE EXCEPTION 'free_jobs_used exceeded its constraint';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SET LOCAL ROLE service_role;

DO $$
DECLARE
  ids hardening_test_ids%ROWTYPE;
  active_result uuid;
  expired_result uuid;
  used_before integer;
  used_after integer;
  purge_before timestamptz;
  purge_after timestamptz;
  anonymized_count integer;
  cleanup_result record;
  applied_before timestamptz;
  first_response_before timestamptz;
  status_before text;
  milestone_result text;
  expiry_before timestamptz;
  expiry_after timestamptz;
  verified_after timestamptz;
  single_use_rejected boolean := false;
BEGIN
  SELECT * INTO ids FROM pg_temp.hardening_test_ids;
  SELECT free_jobs_used INTO used_before
  FROM public.companies WHERE id = ids.company_id;

  SELECT public.claim_external_job(ids.active_claim_hash, ids.employer_id)
    INTO active_result;
  IF active_result <> ids.active_external_job_id THEN
    RAISE EXCEPTION 'Active external claim returned the wrong job';
  END IF;
  SELECT free_jobs_used INTO used_after
  FROM public.companies WHERE id = ids.company_id;
  IF used_after <> used_before + 1 THEN
    RAISE EXCEPTION 'Active claim did not consume one free job';
  END IF;

  SELECT applications_purge_at INTO purge_before
  FROM public.jobs WHERE id = ids.expired_external_job_id;
  SELECT public.claim_external_job(ids.expired_claim_hash, ids.employer_id)
    INTO expired_result;
  IF expired_result <> ids.expired_external_job_id THEN
    RAISE EXCEPTION 'Expired external claim returned the wrong job';
  END IF;
  SELECT status, applications_purge_at
    INTO status_before, purge_after
  FROM public.jobs WHERE id = ids.expired_external_job_id;
  SELECT free_jobs_used INTO used_after
  FROM public.companies WHERE id = ids.company_id;
  IF status_before <> 'EXPIRED' OR used_after <> used_before + 1
    OR purge_after < now() + interval '14 days'
    OR (purge_before IS NOT NULL AND purge_after < purge_before)
  THEN
    RAISE EXCEPTION 'Expired claim changed status/quota or failed to extend review retention';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.claim_log
    WHERE employer_id = ids.employer_id
      AND job_id = ids.expired_external_job_id
  ) OR EXISTS (
    SELECT 1 FROM public.job_external_contacts
    WHERE job_id = ids.expired_external_job_id
  ) THEN
    RAISE EXCEPTION 'Expired claim was not logged or its contact token was retained';
  END IF;

  SELECT expires_at INTO expiry_before
  FROM public.jobs WHERE id = ids.still_hiring_job_id;
  SELECT public.consume_milestone_action(ids.still_hiring_hash, 'still-hiring')
    INTO milestone_result;
  SELECT status, expires_at, last_verified_at
    INTO status_before, expiry_after, verified_after
  FROM public.jobs WHERE id = ids.still_hiring_job_id;
  IF milestone_result <> 'still-hiring'
    OR status_before <> 'ACTIVE'
    OR expiry_after IS DISTINCT FROM expiry_before
    OR verified_after IS NULL
  THEN
    RAISE EXCEPTION 'Still-hiring milestone changed more than verification time';
  END IF;
  BEGIN
    PERFORM public.consume_milestone_action(ids.still_hiring_hash, 'still-hiring');
  EXCEPTION WHEN raise_exception THEN
    single_use_rejected := true;
  END;
  IF NOT single_use_rejected THEN
    RAISE EXCEPTION 'Milestone token was reusable';
  END IF;

  SELECT public.consume_milestone_action(ids.filled_milestone_hash, 'filled')
    INTO milestone_result;
  IF milestone_result <> 'filled'
    OR NOT EXISTS (
      SELECT 1 FROM public.jobs
      WHERE id = ids.filled_milestone_job_id
        AND status = 'FILLED'
        AND applications_purge_at IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.job_external_contacts
      WHERE job_id = ids.filled_milestone_job_id
    )
  THEN
    RAISE EXCEPTION 'Filled milestone did not close the listing and stop contact emails';
  END IF;

  SELECT anonymized INTO anonymized_count
  FROM public.anonymize_expired_applications(50)
  WHERE job_id = ids.anonymize_job_id;
  IF anonymized_count <> 1 THEN
    RAISE EXCEPTION 'Set-based anonymizer returned an unexpected count';
  END IF;

  SELECT applied_at, first_responded_at, status
    INTO applied_before, first_response_before, status_before
  FROM public.applications
  WHERE job_id = ids.anonymize_job_id;
  IF EXISTS (
    SELECT 1
    FROM public.applications
    WHERE job_id = ids.anonymize_job_id
      AND (cover_letter IS NOT NULL OR resume_url IS NOT NULL OR anonymized_at IS NULL)
  ) OR applied_before <> now() - interval '10 days'
    OR first_response_before <> now() - interval '9 days'
    OR status_before <> 'SHORTLISTED'
    OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE id = ids.anonymize_job_id AND applications_purge_at IS NOT NULL
    )
  THEN
    RAISE EXCEPTION 'Anonymization did not preserve non-PII application fields';
  END IF;

  SELECT * INTO cleanup_result FROM public.cleanup_expired_tokens();
  IF cleanup_result.deleted_unsubscribe_tokens <> 1
    OR cleanup_result.cleared_claim_tokens <> 1
    OR cleanup_result.cleared_milestone_tokens <> 1
  THEN
    RAISE EXCEPTION 'Expired token cleanup counts are incorrect';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.email_unsubscribe_tokens
    WHERE token_hash = ids.expired_unsubscribe_hash
  ) OR NOT EXISTS (
    SELECT 1 FROM public.email_unsubscribe_tokens
    WHERE token_hash = ids.valid_unsubscribe_hash
  ) OR EXISTS (
    SELECT 1 FROM public.job_external_contacts
    WHERE job_id = ids.cleanup_job_id
      AND (claim_token_hash IS NOT NULL OR milestone_token_hash IS NOT NULL)
  ) OR NOT EXISTS (
    SELECT 1 FROM public.job_external_contacts
    WHERE job_id = ids.anonymize_job_id
      AND claim_token_hash = ids.valid_contact_claim_hash
      AND milestone_token_hash = ids.valid_milestone_hash
  ) THEN
    RAISE EXCEPTION 'Token cleanup removed valid tokens or retained expired ones';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT employer_id::text FROM hardening_test_ids),
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  ids hardening_test_ids%ROWTYPE;
  applicant_count integer;
BEGIN
  SELECT * INTO ids FROM pg_temp.hardening_test_ids;
  SELECT count(*) INTO applicant_count
  FROM public.applications
  WHERE job_id = ids.expired_external_job_id;
  IF applicant_count <> 1 THEN
    RAISE EXCEPTION 'Employer cannot read applications for a claimed expired listing';
  END IF;
END;
$$;

RESET ROLE;
ROLLBACK;
