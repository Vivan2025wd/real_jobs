drop policy if exists "applications_seeker_own" on public.applications;

create policy "applications_seeker_select_own"
  on public.applications
  for select
  using (auth.uid() = seeker_id);

create policy "applications_seeker_insert_own"
  on public.applications
  for insert
  with check (
    auth.uid() = seeker_id
    and status = 'PENDING'
  );

create policy "applications_seeker_delete_own"
  on public.applications
  for delete
  using (auth.uid() = seeker_id);
