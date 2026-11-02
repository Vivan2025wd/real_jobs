ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS first_responded_at timestamptz;

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'updated_at'
  ) THEN
    EXECUTE '
      UPDATE public.applications
      SET first_responded_at = updated_at
      WHERE status <> ''PENDING''
        AND first_responded_at IS NULL
    ';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_application_first_responded_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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

DROP TRIGGER IF EXISTS applications_first_responded_at ON public.applications;

CREATE TRIGGER applications_first_responded_at
  BEFORE UPDATE OF status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_application_first_responded_at();

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS total_applications_90d integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS responded_applications_90d integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_response_hours numeric,
  ADD COLUMN IF NOT EXISTS response_rate_cached_at timestamptz;

CREATE INDEX IF NOT EXISTS applications_job_id_applied_at_idx
  ON public.applications(job_id, applied_at);

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
    GROUP BY c.id
  ) AS stats
  WHERE company.id = stats.company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_employer_response_rates()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_employer_response_rates()
  TO service_role;
