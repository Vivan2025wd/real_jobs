-- ---------------------------------------------------------------------------
-- One company per employer.
--
-- Root cause: saveCompany() used SELECT -> INSERT/UPDATE in two round trips.
-- Two submits landing close together (double click, retry, two tabs) could
-- both see "no company" and both INSERT, leaving duplicate rows per employer.
--
-- Because reads use .maybeSingle(), 2+ rows make the query return null, so
-- the dashboard rendered the first-run empty state even though the data was
-- there — a data integrity bug that presented as a UI bug.
--
-- This migration:
--   1. re-points jobs owned by a duplicate company at the row we keep.
--      jobs.company_id is ON DELETE CASCADE, so without this step deleting a
--      duplicate would silently delete its job listings and applications.
--   2. deletes the duplicates deterministically, keeping the OLDEST company
--      per employer (ties broken by id, so the result is stable).
--   3. enforces one company per employer going forward.
--
-- The first company is kept because it is the one the user intentionally
-- filled in; duplicates are blank rows from a second submit racing the first.
-- ---------------------------------------------------------------------------

-- ─── 1. Move any job listings off duplicate companies onto the keeper ───
update public.jobs j
set company_id = keeper.keep_id
from public.companies dup
join (
  select distinct on (employer_id)
         employer_id,
         id as keep_id
  from public.companies
  order by employer_id, created_at asc, id asc
) keeper
  on keeper.employer_id = dup.employer_id
where j.company_id = dup.id
  and dup.id <> keeper.keep_id;

-- ─── 2. Delete the duplicate companies ───
delete from public.companies dup
using (
  select distinct on (employer_id)
         employer_id,
         id as keep_id
  from public.companies
  order by employer_id, created_at asc, id asc
) keeper
where dup.employer_id = keeper.employer_id
  and dup.id <> keeper.keep_id;

-- ─── 3. Enforce one company per employer ───
alter table public.companies
  add constraint companies_employer_id_key unique (employer_id);
