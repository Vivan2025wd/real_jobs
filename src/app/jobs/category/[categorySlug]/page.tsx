import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { JobCard } from "@/components/jobs/JobCard";
import { Button } from "@/components/ui/Button";
import {
  CATEGORY_LABELS,
  CATEGORY_SLUGS,
  type JobCategory,
} from "@/lib/validators/job";
import type { PublicJobCard } from "@/types/job";

export const revalidate = 600; // ISR: 10 minutes

// Pre-render one static landing page per known category.
export function generateStaticParams() {
  return Object.keys(CATEGORY_SLUGS).map((slug) => ({ categorySlug: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { categorySlug: string };
}): Promise<Metadata> {
  const category = CATEGORY_SLUGS[params.categorySlug];
  if (!category) return { title: "Category not found" };
  const label = CATEGORY_LABELS[category];
  return {
    title: `${label} jobs`,
    description: `Browse active ${label.toLowerCase()} jobs on HireLoop. Every listing is verified weekly.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: { categorySlug: string };
}) {
  const category: JobCategory | undefined = CATEGORY_SLUGS[params.categorySlug];
  if (!category) notFound();

  const label = CATEGORY_LABELS[category];
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, title, location, work_type, category, salary_min, salary_max, created_at, companies!inner(company_name, logo_url)"
    )
    .eq("status", "ACTIVE")
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<PublicJobCard[]>();

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
          <Link
            href="/jobs"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← All jobs
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">Category</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">{label} jobs</h1>
          <p className="mt-2 text-gray-600">
            {jobs?.length
              ? `${jobs.length} active ${label.toLowerCase()} job${jobs.length === 1 ? "" : "s"} on HireLoop right now.`
              : `No active ${label.toLowerCase()} jobs at the moment — check back soon.`}
          </p>
        </div>

        {!jobs?.length ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">
              Nothing in {label} right now.
            </p>
            <Link href="/jobs" className="mt-4 inline-block">
              <Button variant="secondary" size="sm">
                Browse all jobs
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}