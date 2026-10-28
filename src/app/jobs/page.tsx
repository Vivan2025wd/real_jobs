import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobFilters } from "@/components/jobs/JobFilters";
import { JobList } from "@/components/jobs/JobList";
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

// Filters that count toward the "active filter" badge. `sort` is excluded
// because it changes order, not scope.
const FILTER_KEYS: (keyof SearchParams)[] = [
  "q",
  "location",
  "category",
  "work_type",
  "salary_min",
];

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
  const activeFilterCount = FILTER_KEYS.filter((k) => searchParams[k]).length;
  const hasFilters = activeFilterCount > 0;

  function hrefForPage(nextPage: number) {
    const next = new URLSearchParams();
    (Object.keys(searchParams) as (keyof SearchParams)[]).forEach((k) => {
      if (k !== "page" && searchParams[k]) next.set(k, searchParams[k]!);
    });
    if (nextPage > 1) next.set("page", String(nextPage));
    return `/jobs${next.size ? `?${next.toString()}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* ─── Sticky glass header ─── */}
      <header className="sticky top-0 z-40 border-b border-gray-200/60 glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm text-white shadow-sm">
              H
            </span>
            <span className="tracking-tight text-gray-900">RealJobs</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/jobs"
              className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700"
            >
              Browse jobs
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {/* ─── Hero ─── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Open roles
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {total === 0
                  ? hasFilters
                    ? "No jobs match your filters."
                    : "No active jobs right now."
                  : `${total.toLocaleString()} active job${total === 1 ? "" : "s"}`}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                <span className="inline-flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  Verified weekly
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Two-column layout ─── */}
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <Suspense fallback={<FiltersSkeleton />}>
            <JobFilters />
          </Suspense>

          <div className="space-y-4">
            {/* ─── Results bar ─── */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <strong className="text-gray-900">{total}</strong>{" "}
                {total === 1 ? "result" : "results"}
                {hasFilters && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                    <Filter className="h-3 w-3" />
                    {activeFilterCount} filter
                    {activeFilterCount === 1 ? "" : "s"}
                  </span>
                )}
              </p>
              {hasFilters && (
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </Link>
              )}
            </div>

            {/* ─── Results ─── */}
            {!jobs?.length ? (
              <EmptyState hasFilters={hasFilters} />
            ) : (
              <>
                <JobList jobs={jobs} />

                {totalPages > 1 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    hrefForPage={hrefForPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FiltersSkeleton — matches the shape of JobFilters so nothing shifts
// ---------------------------------------------------------------------------
function FiltersSkeleton() {
  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-10 animate-pulse rounded bg-gray-100" />
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded-lg border border-gray-100 bg-gray-50" />
        </div>
      ))}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// EmptyState — different copy for "no filters" vs "filters too narrow"
// ---------------------------------------------------------------------------
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-card">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/40 blur-3xl" />

      <div className="relative flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600">
          <Search className="h-7 w-7" />
        </div>

        {hasFilters ? (
          <>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                No jobs match your filters
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-balance text-sm text-gray-500">
                Try removing a filter or two — the active listings change
                weekly, so new roles show up here often.
              </p>
            </div>
            <Link href="/jobs">
              <Button variant="secondary" icon={<X className="h-4 w-4" />}>
                Clear all filters
              </Button>
            </Link>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                No active jobs right now
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-balance text-sm text-gray-500">
                We verify every listing weekly, so this page is guaranteed to be
                honest. Check back soon — new roles appear as employers post
                them.
              </p>
            </div>
            <Link href="/register?role=EMPLOYER">
              <Button variant="secondary">Post a job</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination — prev/next with icons and better visual hierarchy
// ---------------------------------------------------------------------------
function Pagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (n: number) => string;
}) {
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-6">
      {prevDisabled ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-300">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </span>
      ) : (
        <Link
          href={hrefForPage(page - 1)}
          className="group inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
          Previous
        </Link>
      )}

      <p className="text-xs text-gray-500">
        Page <strong className="text-gray-900">{page}</strong> of{" "}
        <strong className="text-gray-900">{totalPages}</strong>
      </p>

      {nextDisabled ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-300">
          Next
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <Link
          href={hrefForPage(page + 1)}
          className="group inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
        >
          Next
          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}