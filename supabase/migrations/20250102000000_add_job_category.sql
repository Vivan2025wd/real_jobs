-- Add a normalised category to jobs so we can have SEO landing pages
-- like /jobs/category/engineering.
alter table public.jobs
  add column category text;

alter table public.jobs
  add constraint jobs_category_check check (
    category is null or category in (
      'ENGINEERING',
      'DESIGN',
      'MARKETING',
      'SALES',
      'CUSTOMER_SUPPORT',
      'FINANCE',
      'OPERATIONS',
      'HR',
      'OTHER'
    )
  );

create index jobs_category_idx on public.jobs(category);
create index jobs_status_category_created_idx
  on public.jobs(status, category, created_at desc);