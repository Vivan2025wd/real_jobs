create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filters jsonb not null
    check (
      jsonb_typeof(filters) = 'object'
      and filters - array[
        'q',
        'location',
        'category',
        'work_type',
        'salary_min',
        'sort'
      ]::text[] = '{}'::jsonb
    ),
  alert_frequency text not null default 'DAILY'
    check (alert_frequency in ('DAILY', 'WEEKLY', 'NONE')),
  last_alerted_at timestamptz not null default now(),
  unsubscribe_token text not null unique
    default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  unique (user_id, filters)
);

alter table public.saved_searches enable row level security;

create policy "saved_searches_select_own"
  on public.saved_searches for select
  using (auth.uid() = user_id);

create policy "saved_searches_insert_own"
  on public.saved_searches for insert
  with check (auth.uid() = user_id);

create policy "saved_searches_update_own"
  on public.saved_searches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_searches_delete_own"
  on public.saved_searches for delete
  using (auth.uid() = user_id);

create or replace function public.save_saved_search(
  p_filters jsonb,
  p_alert_frequency text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  existing_id uuid;
  saved_search_id uuid;
  search_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_alert_frequency not in ('DAILY', 'WEEKLY', 'NONE') then
    raise exception 'Invalid alert frequency';
  end if;

  if jsonb_typeof(p_filters) <> 'object'
     or p_filters - array[
       'q',
       'location',
       'category',
       'work_type',
       'salary_min',
       'sort'
     ]::text[] <> '{}'::jsonb then
    raise exception 'Invalid saved-search filters';
  end if;

  if not (
    coalesce(nullif(trim(p_filters ->> 'q'), '') is not null, false)
    or coalesce(nullif(trim(p_filters ->> 'location'), '') is not null, false)
    or coalesce(nullif(trim(p_filters ->> 'category'), '') is not null, false)
    or coalesce(nullif(trim(p_filters ->> 'work_type'), '') is not null, false)
    or coalesce(
      case
        when jsonb_typeof(p_filters -> 'salary_min') = 'number'
          then (p_filters ->> 'salary_min')::numeric > 0
        else false
      end,
      false
    )
  ) then
    raise exception 'At least one search filter is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select id into existing_id
  from public.saved_searches
  where user_id = current_user_id and filters = p_filters;

  if existing_id is null then
    select count(*) into search_count
    from public.saved_searches
    where user_id = current_user_id;

    if search_count >= 10 then
      raise exception 'You can save up to 10 searches';
    end if;
  end if;

  insert into public.saved_searches (user_id, filters, alert_frequency)
  values (current_user_id, p_filters, p_alert_frequency)
  on conflict (user_id, filters)
  do update set alert_frequency = excluded.alert_frequency
  returning id into saved_search_id;

  return saved_search_id;
end;
$$;

create or replace function public.set_saved_search_alert(
  p_id uuid,
  p_alert_frequency text
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  updated_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_alert_frequency not in ('DAILY', 'WEEKLY', 'NONE') then
    raise exception 'Invalid alert frequency';
  end if;

  update public.saved_searches
  set alert_frequency = p_alert_frequency
  where id = p_id and user_id = current_user_id;

  get diagnostics updated_count = row_count;
  if updated_count = 0 then
    raise exception 'Saved search not found';
  end if;

  return true;
end;
$$;

create index saved_searches_alert_frequency_idx
  on public.saved_searches (alert_frequency, last_alerted_at)
  where alert_frequency <> 'NONE';

alter table public.jobs
  add column if not exists published_at timestamptz;

update public.jobs
set published_at = created_at
where status = 'ACTIVE' and published_at is null;

create index if not exists jobs_active_published_at_idx
  on public.jobs (published_at)
  where status = 'ACTIVE';

create or replace function public.set_job_first_published_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.published_at := case
      when new.status = 'ACTIVE' then now()
      else null
    end;
  elsif old.published_at is not null then
    new.published_at := old.published_at;
  elsif new.status = 'ACTIVE' then
    new.published_at := now();
  else
    new.published_at := null;
  end if;

  return new;
end;
$$;

create trigger jobs_set_first_published_at
  before insert or update on public.jobs
  for each row
  execute function public.set_job_first_published_at();
