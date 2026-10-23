// src/types/user.ts
//
// App-level user types. `database.types.ts` describes the raw DB rows; this
// file layers the domain meaning on top and provides a couple of helpers
// used across the app.

import type { User } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
export type UserRole = "EMPLOYER" | "JOB_SEEKER";

// ---------------------------------------------------------------------------
// User row (mirrors public.users)
// ---------------------------------------------------------------------------
export type UserRow = {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  resume_url: string | null;
  resume_uploaded_at: string | null;
};

// Minimal shape used in dashboard pages that only need the identity fields.
export type PublicUser = Pick<UserRow, "id" | "email" | "role">;

// Seeker-specific view — what ResumeUpload and ApplyButton read.
export type SeekerProfile = {
  id: string;
  email: string;
  resume_url: string | null;
  resume_uploaded_at: string | null;
};

// ---------------------------------------------------------------------------
// Company row (mirrors public.companies)
// ---------------------------------------------------------------------------
export type CompanyRow = {
  id: string;
  employer_id: string;
  company_name: string;
  logo_url: string | null;
  description: string | null;
  is_verified: boolean;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a normalised role from a Supabase auth user.
 * Falls back to JOB_SEEKER for missing / unknown metadata so callers never
 * have to handle `null` — the DB constraint on `users.role` guarantees
 * one of the two valid values, and the sign-up flow always sets it.
 */
export function getUserRole(user: User | null | undefined): UserRole {
  if (!user) return "JOB_SEEKER";
  const raw = (user.user_metadata?.role as string | undefined)?.toUpperCase();
  return raw === "EMPLOYER" ? "EMPLOYER" : "JOB_SEEKER";
}

/**
 * Type guard — narrows an arbitrary string to `UserRole`.
 */
export function isUserRole(value: unknown): value is UserRole {
  return value === "EMPLOYER" || value === "JOB_SEEKER";
}

/**
 * Where each role's dashboard lives. Used by middleware, login redirects,
 * and the callback route.
 */
export const DASHBOARD_PATH: Record<UserRole, string> = {
  EMPLOYER: "/dashboard/employer",
  JOB_SEEKER: "/dashboard/seeker",
};

export function dashboardPathFor(role: UserRole): string {
  return DASHBOARD_PATH[role];
}