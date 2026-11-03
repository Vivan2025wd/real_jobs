import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type JobSearchFilters = {
  q?: string;
  location?: string;
  category?: string;
  work_type?: string;
  salary_min?: number;
  sort?: "newest" | "salary";
};

type SearchParamsInput = unknown;

const FILTER_KEYS = [
  "q",
  "location",
  "category",
  "work_type",
  "salary_min",
  "sort",
] as const;

const JOB_CARD_SELECT =
  "id, title, source, source_url, external_company_name, claimed_at, location, work_type, category, salary_min, salary_max, created_at, companies!inner(company_name, logo_url, total_applications_90d, responded_applications_90d, avg_response_hours, response_rate_cached_at)";

function getValue(params: SearchParamsInput, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  if (!params || typeof params !== "object") return undefined;

  const value = (params as Record<string, unknown>)[key];
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return Array.isArray(value) && typeof value[0] === "string"
    ? value[0]
    : undefined;
}

export function parseJobSearchFilters(
  params: SearchParamsInput
): JobSearchFilters {
  const filters: JobSearchFilters = {};

  for (const key of ["q", "location", "category"] as const) {
    const value = getValue(params, key)?.trim();
    if (value) filters[key] = value;
  }

  const workType = getValue(params, "work_type")?.trim();
  if (workType) filters.work_type = workType;

  const salaryMin = getValue(params, "salary_min");
  if (salaryMin) {
    const parsed = Number.parseInt(salaryMin, 10);
    if (Number.isFinite(parsed)) filters.salary_min = parsed;
  }

  if (getValue(params, "sort") === "salary") filters.sort = "salary";
  else if (getValue(params, "sort") === "newest") filters.sort = "newest";

  return filters;
}

export function hasSearchCriteria(filters: JobSearchFilters): boolean {
  return Boolean(
    filters.q ||
      filters.location ||
      filters.category ||
      filters.work_type ||
      (filters.salary_min !== undefined && filters.salary_min > 0)
  );
}

export function normalizeJobSearchFilters(
  filters: JobSearchFilters
): JobSearchFilters {
  const normalized: JobSearchFilters = {};
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value !== undefined && value !== "") {
      if (key === "q" || key === "location" || key === "category") {
        if (typeof value === "string") normalized[key] = value;
      } else if (key === "work_type") {
        if (typeof value === "string") normalized.work_type = value;
      } else if (key === "salary_min") {
        if (typeof value === "number" && Number.isFinite(value)) {
          normalized.salary_min = value;
        }
      } else if (key === "sort" && (value === "newest" || value === "salary")) {
        normalized.sort = value;
      }
    }
  }
  return normalized;
}

export function summarizeJobSearch(filters: JobSearchFilters): string {
  const summary: string[] = [];
  if (filters.q) summary.push(`Keyword: ${filters.q}`);
  if (filters.location) summary.push(`Location: ${filters.location}`);
  if (filters.category) {
    const label = filters.category
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    summary.push(`Category: ${label}`);
  }
  if (filters.work_type) {
    const labels: Record<string, string> = {
      REMOTE: "Remote",
      ONSITE: "On-site",
      HYBRID: "Hybrid",
    };
    summary.push(`Work type: ${labels[filters.work_type] ?? filters.work_type}`);
  }
  if (filters.salary_min !== undefined) {
    summary.push(`Min salary: LKR ${filters.salary_min.toLocaleString()}`);
  }
  return summary.join(" · ") || "All jobs";
}

export function buildJobsSearchQuery(
  client: SupabaseClient<Database>,
  filters: JobSearchFilters,
  options: {
    count?: "exact";
    status?: string;
    publishedAfter?: string;
  } = {}
) {
  let query = client
    .from("jobs")
    .select(JOB_CARD_SELECT, options.count ? { count: options.count } : {})
    .eq("status", options.status ?? "ACTIVE");

  if (filters.q) query = query.ilike("title", `%${filters.q}%`);
  if (filters.location) query = query.ilike("location", `%${filters.location}%`);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.work_type) query = query.eq("work_type", filters.work_type);
  if (filters.salary_min !== undefined) {
    query = query.gte("salary_max", filters.salary_min);
  }
  if (options.publishedAfter) {
    query = query.gt("published_at", options.publishedAfter);
  }

  if (filters.sort === "salary") {
    query = query.order("salary_max", {
      ascending: false,
      nullsFirst: false,
    });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  return query;
}
