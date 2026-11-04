ALTER TABLE public.job_external_contacts
  ADD COLUMN IF NOT EXISTS milestone_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS milestone_token_hash text,
  ADD COLUMN IF NOT EXISTS milestone_token_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS job_external_contacts_milestone_token_hash_key
  ON public.job_external_contacts (milestone_token_hash)
  WHERE milestone_token_hash IS NOT NULL;
