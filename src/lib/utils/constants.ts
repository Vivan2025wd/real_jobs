// src/lib/utils/constants.ts
//
// Shared values that appear in more than one module. Everything here is
// either a magic number that was previously scattered, or a display label
// used across the dashboard and the public site.

export const APP_NAME = "HireLoop";

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------
export const JOB_POSTING_FEE_LKR = "2500.00";
export const PAYMENT_CURRENCY = "LKR";

// ---------------------------------------------------------------------------
// Verification lifecycle
// ---------------------------------------------------------------------------
export const VERIFICATION_CYCLE_DAYS = 14;
export const VERIFICATION_GRACE_HOURS = 48;
export const VERIFICATION_GRACE_MS =
  VERIFICATION_GRACE_HOURS * 60 * 60 * 1000;
export const VERIFICATION_CYCLE_MS =
  VERIFICATION_CYCLE_DAYS * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Upload limits
// ---------------------------------------------------------------------------
export const RESUME_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const COMPANY_LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export const RESUME_ALLOWED_MIME_TYPES = ["application/pdf"] as const;
export const COMPANY_LOGO_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export const JOBS_PAGE_SIZE = 20;
export const CATEGORY_PAGE_SIZE = 50;
export const DASHBOARD_RECENT_ITEMS = 5;

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------
/**
 * Canonical base URL. Trailing slash stripped so callers can safely
 * concatenate with `/path` without producing `//path`.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ??
  "http://localhost:3000";

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------
export {
  WORK_TYPE_LABELS,
  JOB_STATUS_LABELS,
  APPLICATION_STATUS_LABELS,
  CATEGORY_LABELS,
} from "@/types/job";