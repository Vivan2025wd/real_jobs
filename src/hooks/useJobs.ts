// src/hooks/useJobs.ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PublicJobCard, WorkType } from "@/types/job";

export type JobFilters = {
  /** Keyword — matched against `title` (ilike). */
  q?: string;
  /** Location string — matched against `location` (ilike). */
  location?: string;
  /** Exact category match, e.g. `"ENGINEERING"`. Empty string = no filter. */
  category?: string;
  /** Exact work type. Empty string = no filter. */
  work_type?: WorkType | "";
  /** Minimum salary — rows with `salary_max >= salary_min` are returned. */
  salary_min?: number;
  /** Sort order. Defaults to `"newest"`. */
  sort?: "newest" | "salary";
  /** Max rows. Defaults to 20. */
  limit?: number;
};

export type UseJobsResult = {
  jobs: PublicJobCard[];
  loading: boolean;
  error: string | null;
  /** Trigger a fresh fetch without changing filters. */
  refetch: () => void;
};

/**
 * Client-side hook for querying the public job board.
 *
 * The dependency array uses each filter primitive individually — pass a fresh
 * filters object on every render without worrying about referential equality.
 * The hook only re-fetches when a primitive *value* actually changes.
 *
 * Filters with empty-string / 0 / undefined values are treated as "no filter".
 *
 * Do NOT use this on the SSR `/jobs` page — that page already runs the same
 * query server-side for SEO. This hook is for client interactions: infinite
 * scroll, admin dashboards, live previews, etc.
 */
export function useJobs(filters: JobFilters = {}): UseJobsResult {
  const {
    q,
    location,
    category,
    work_type,
    salary_min,
    sort = "newest",
    limit = 20,
  } = filters;

  const [jobs, setJobs] = useState<PublicJobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchJobs() {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      let query = supabase
        .from("jobs")
        .select(
          "id, title, location, work_type, category, salary_min, salary_max, created_at, companies!inner(company_name, logo_url)"
        )
        .eq("status", "ACTIVE");

      // Empty strings and 0 are falsy — safe to skip.
      if (q) query = query.ilike("title", `%${q}%`);
      if (location) query = query.ilike("location", `%${location}%`);
      if (category) query = query.eq("category", category);
      if (work_type) query = query.eq("work_type", work_type);
      if (salary_min && salary_min > 0) {
        query = query.gte("salary_max", salary_min);
      }

      if (sort === "salary") {
        query = query.order("salary_max", {
          ascending: false,
          nullsFirst: false,
        });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error: supabaseError } = await query
        .limit(limit)
        .returns<PublicJobCard[]>();

      if (cancelled) return;

      if (supabaseError) {
        setError(supabaseError.message);
        setJobs([]);
      } else {
        setJobs(data ?? []);
      }
      setLoading(false);
    }

    fetchJobs();

    return () => {
      cancelled = true;
    };
  }, [
    q,
    location,
    category,
    work_type,
    salary_min,
    sort,
    limit,
    refetchKey,
  ]);

  return {
    jobs,
    loading,
    error,
    refetch: () => setRefetchKey((k) => k + 1),
  };
}