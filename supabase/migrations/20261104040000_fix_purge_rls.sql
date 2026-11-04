-- ---------------------------------------------------------------------------
-- Migration: 20261104040000_fix_purge_rls.sql
-- Fix: Prevent employers from tampering with applications_purge_at (Issue 2)
-- Fix: Hide applicant identity from users table once application is anonymized (Issue 3)
-- ---------------------------------------------------------------------------

-- Issue 2: Protect applications_purge_at from authenticated user modification
CREATE OR REPLACE FUNCTION public.protect_applications_purge_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NEW.applications_purge_at IS DISTINCT FROM OLD.applications_purge_at THEN
    RAISE EXCEPTION 'Unauthorized to modify retention settings';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_applications_purge_at ON public.jobs;
CREATE TRIGGER trg_protect_applications_purge_at
  BEFORE UPDATE OF applications_purge_at ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_applications_purge_at();

-- Issue 3: Update users_employer_read_applicants to filter out anonymized applications
DROP POLICY IF EXISTS "users_employer_read_applicants" ON public.users;

CREATE POLICY "users_employer_read_applicants"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.companies c ON c.id = j.company_id
      WHERE a.seeker_id = users.id
        AND c.employer_id = auth.uid()
        AND a.anonymized_at IS NULL
    )
  );

-- Optimize indexed lookup for non-anonymized applications
CREATE INDEX IF NOT EXISTS applications_seeker_id_active_idx
  ON public.applications (seeker_id)
  WHERE anonymized_at IS NULL;
