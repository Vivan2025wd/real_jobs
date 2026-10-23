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
  | "REJECTED";
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
  location: string;
  work_type: WorkType;
  category: string | null;
  salary_min: number | null;
  salary_max: number | null;
  created_at: string;
  companies: {
    company_name: string;
    logo_url: string | null;
  };
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
  };
};

// ---------------------------------------------------------------------------
// Employer dashboard — full row from public.jobs
// ---------------------------------------------------------------------------
export type JobRow = {
  id: string;
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
};

// What the employer's job detail page selects.
export type ApplicationWithSeeker = {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  resume_url: string;
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