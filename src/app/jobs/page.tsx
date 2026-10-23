import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { JobCard } from "@/components/jobs/JobCard";
import { JobFilters } from "@/components/jobs/JobFilters";
import { Button } from "@/components/ui/Button";
import type { PublicJobCard } from "@/types/job";

export const metadata: Metadata = {
  title: "Browse jobs",
  description:
    "Browse verified, up-to-date jobs across engineering, design, marketing, and more.",
};

// Public search depends on URL params + session cookie → always dynamic.
export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  location?: string;
  category?: string;
  work_type?: string;
  salary_min?: string;
  sort?: string;
  page?: string;
};

const PAGE_SIZE = 20;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("jobs")
    .select(
      "id, title, location, work_type, category, salary_min, salary_max, created_at, companies!inner(company_name, logo_url)",
      { count: "exact" }
    )
    .eq("status", "ACTIVE");

  if (searchParams.q) {
    query = query.ilike("title", `%${searchParams.q}%`);
  }
  if (searchParams.location) {
    query = query.ilike("location", `%${searchParams.location}%`);
  }
  if (searchParams.category) {
    query = query.eq("category", searchParams.category);
  }
  if (searchParams.work_type) {
    query = query.eq("work_type", searchParams.work_type);
  }
  if (searchParams.salary_min) {
    const min = parseInt(searchParams.salary_min, 10);
    if (!Number.isNaN(min)) {
      query = query.gte("salary_max", min);
    }
  }

  if (searchParams.sort === "salary") {
    query = query.order("salary_max", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: jobs, count } = await query
    .range(from, to)
    .returns<PublicJobCard[]>();

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function hrefForPage(nextPage: number) {
    const next = new URLSearchParams();
    (Object.keys(searchParams) as (keyof SearchParams)[]).forEach((k) => {
      if (k !== "page" && searchParams[k]) next.set(k, searchParams[k]!);
    });
    if (nextPage > 1) next.set("page", String(nextPage));
    return `/jobs${next.size ? `?${next.toString()}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              H
            </span>
            HireLoop
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/jobs" className="font-medium text-blue-700">
              Browse jobs
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Open roles</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total === 0
              ? "No jobs match your filters."
              : `${total.toLocaleString()} active job${total === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <Suspense
            fallback={<div className="h-64 animate-pulse rounded-md bg-gray-100" />}
          >
            <JobFilters />
          </Suspense>

          <div className="space-y-3">
            {!jobs?.length ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <p className="text-sm text-gray-500">
                  No jobs match the current filters.
                </p>
                <Link href="/jobs" className="mt-4 inline-block">
                  <Button variant="secondary" size="sm">
                    Clear filters
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <Link
                      href={hrefForPage(page - 1)}
                      aria-disabled={page <= 1}
                      className={
                        page <= 1
                          ? "pointer-events-none opacity-40"
                          : "text-sm font-medium text-blue-600 hover:underline"
                      }
                    >
                      ← Previous
                    </Link>
                    <p className="text-xs text-gray-500">
                      Page {page} of {totalPages}
                    </p>
                    <Link
                      href={hrefForPage(page + 1)}
                      aria-disabled={page >= totalPages}
                      className={
                        page >= totalPages
                          ? "pointer-events-none opacity-40"
                          : "text-sm font-medium text-blue-600 hover:underline"
                      }
                    >
                      Next →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}