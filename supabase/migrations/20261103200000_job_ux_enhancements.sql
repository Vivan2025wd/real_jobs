ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name text;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_image_url text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
