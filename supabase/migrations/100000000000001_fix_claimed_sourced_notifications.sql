-- ============================================================================
-- FIX 3 (FLAW-7): Allow application notification emails for EXTERNAL jobs
--   that have been claimed by a real employer.
--
-- Root cause: get_application_notification_details filtered with
--   AND j.source <> 'EXTERNAL'
-- which blocked ALL external/sourced jobs — including ones that an employer
-- has already claimed. After claiming, the job belongs to a real employer who
-- expects to receive application notification emails.
--
-- Fix: allow the email if the job is not external, OR if it has been claimed
--   (claimed_at IS NOT NULL).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_application_notification_details(
  p_application_id uuid
)
RETURNS TABLE (
  seeker_email  text,
  job_title     text,
  company_name  text,
  employer_email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    seeker.email,
    j.title,
    c.company_name,
    employer.email
  FROM public.applications AS a
  JOIN public.users  AS seeker   ON seeker.id   = a.seeker_id
  JOIN public.jobs   AS j        ON j.id         = a.job_id
  JOIN public.companies AS c     ON c.id          = j.company_id
  JOIN public.users  AS employer ON employer.id  = c.employer_id
  WHERE a.id = p_application_id
    AND (j.source <> 'EXTERNAL' OR j.claimed_at IS NOT NULL);
$$;
