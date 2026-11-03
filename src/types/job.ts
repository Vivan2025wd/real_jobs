// src/types/job.ts
//
// Domain types for the job board. Public* types are what the browser sees;
// Row types mirror the DB shape for server pages.

// ---------------------------------------------------------------------------
// Unions
// ---------------------------------------------------------------------------
export type WorkType = "REMOTE" | "ONSITE" | "HYBRID";
export type JobStatus =
  | "DRAFT"
  | "ACTIVE"
  | "FILLED"
  | "EXPIRED"
  | "ARCHIVED";
export type ApplicationStatus =
  | "PENDING"
  | "REVIEWED"
  | "SHORTLISTED"
  | "REJECTED"
  | "WITHDRAWN";
export type JobCategory =
  | "ENGINEERING"
  | "DESIGN"
  | "MARKETING"
  | "SALES"
  | "CUSTOMER_SUPPORT"
  | "FINANCE"
  | "OPERATIONS"
  | "HR"
  | "OTHER";

// ---------------------------------------------------------------------------
// Public-facing cards (search results, category pages)
// ---------------------------------------------------------------------------
export type PublicJobCard = {
  id: string;
  title: string;
  source: "NATIVE" | "EXTERNAL";
  source_url: string | null;
  external_company_name: string | null;
  claimed_at: string | null;
  location: string;
  work_type: WorkType;
  category: string | null;
  salary_min: number | null;
  salary_max: number | null;
  created_at: string;
  companies: {
    company_name: string;
    logo_url: string | null;
    total_applications_90d: number;
    responded_applications_90d: number;
    avg_response_hours: number | null;
    response_rate_cached_at: string | null;
  };
};

export function isExternalUnclaimed(job: {
  source?: string;
  claimed_at?: string | null;
}): boolean {
  return job.source === "EXTERNAL" && !job.claimed_at;
}

export function publicCompanyName(job: {
  source?: string;
  claimed_at?: string | null;
  external_company_name?: string | null;
  companies: { company_name: string };
}): string {
  return isExternalUnclaimed(job)
    ? job.external_company_name || job.companies.company_name
    : job.companies.company_name;
};

// ---------------------------------------------------------------------------
// Public job detail (/jobs/[id])
// ---------------------------------------------------------------------------
export type PublicJobDetail = PublicJobCard & {
  description: string;
  last_verified_at: string | null;
  companies: {
    company_name: string;
    logo_url: string | null;
    description: string | null;
    is_verified: boolean;
    total_applications_90d: number;
    responded_applications_90d: number;
    avg_response_hours: number | null;
  };
};

// ---------------------------------------------------------------------------
// Employer dashboard — full row from public.jobs
// ---------------------------------------------------------------------------
export type JobRow = {
  id: string;
  source: "NATIVE" | "EXTERNAL";
  source_url: string | null;
  external_company_name: string | null;
  claimed_at: string | null;
  company_id: string;
  title: string;
  description: string;
  location: string;
  work_type: WorkType;
  category: string | null;
  salary_min: number | null;
  salary_max: number | null;
  status: JobStatus;
  created_at: string;
  last_verified_at: string | null;
  verification_token: string | null;
  verification_sent_at: string | null;

  // Lifecycle (added by 20261028000000_job_lifecycle.sql)
  duration_days: number;
  expires_at: string | null;
  notified_10_applicants_at: string | null;
  notified_stale_at: string | null;
  notified_expiring_at: string | null;

  // Pricing (added by 20261028100000_job_pricing.sql)
  price_lkr: number;
};
// Trimmed row for the employer's jobs list — the columns that list actually
// selects. Narrower type catches accidental `.map(j => j.description)` in
// the list view, where description isn't fetched.
export type JobListRow = Pick<
  JobRow,
  | "id"
  | "title"
  | "status"
  | "work_type"
  | "location"
  | "salary_min"
  | "salary_max"
  | "created_at"
>;

// ---------------------------------------------------------------------------
// Application rows
// ---------------------------------------------------------------------------
export type ApplicationRow = {
  id: string;
  job_id: string;
  seeker_id: string;
  resume_url: string;
  status: ApplicationStatus;
  applied_at: string;
  cover_letter: string | null;
  consent_at: string | null;
};

// What the employer's job detail page selects.
export type ApplicationWithSeeker = {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  resume_url: string;
  cover_letter: string | null;
  users: {
    email: string;
  };
};

// What the seeker's applications list selects.
export type ApplicationWithJob = {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  jobs: {
    title: string;
    source: "NATIVE" | "EXTERNAL";
    external_company_name: string | null;
    claimed_at: string | null;
    companies: { company_name: string };
  };
};

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------
export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  REMOTE: "Remote",
  ONSITE: "On-site",
  HYBRID: "Hybrid",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  FILLED: "Filled",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  ENGINEERING: "Engineering",
  DESIGN: "Design",
  MARKETING: "Marketing",
  SALES: "Sales",
  CUSTOMER_SUPPORT: "Customer Support",
  FINANCE: "Finance",
  OPERATIONS: "Operations",
  HR: "HR",
  OTHER: "Other",
};

export function workTypeLabel(value: WorkType): string {
  return WORK_TYPE_LABELS[value];
}