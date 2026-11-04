-- Backfill fix for sourced-listing duration handling.
-- The original post-create RPC was hard-coded to 14 days.

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
    p_salary_min, p_salary_max, 'ACTIVE', p_duration_days, 0,
    now() + (p_duration_days * interval '1 day'),
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
  uuid, text, text, text, text, text, integer, integer, text, text, text, text, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_sourced_job(
  uuid, text, text, text, text, text, integer, integer, text, text, text, text, integer
) TO service_role;
