-- Store the seeker's current resume so they don't re-upload on every apply.
alter table public.users
  add column if not exists resume_url text,
  add column if not exists resume_uploaded_at timestamptz;