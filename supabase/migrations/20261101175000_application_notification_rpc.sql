create or replace function public.get_application_notification_details(
  p_application_id uuid
)
returns table (
  seeker_email text,
  job_title text,
  company_name text,
  employer_email text
)
language sql
security definer
set search_path = ''
as $$
  select
    seeker.email,
    j.title,
    c.company_name,
    employer.email
  from public.applications a
  join public.users seeker on seeker.id = a.seeker_id
  join public.jobs j on j.id = a.job_id
  join public.companies c on c.id = j.company_id
  join public.users employer on employer.id = c.employer_id
  where a.id = p_application_id
    and a.seeker_id = (select auth.uid());
$$;

revoke all on function public.get_application_notification_details(uuid)
  from public, anon;
grant execute on function public.get_application_notification_details(uuid)
  to authenticated;
