import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Code2,
  Palette,
  Megaphone,
  TrendingUp,
  Headphones,
  Calculator,
  Cog,
  UserCircle2,
  Layers,
  ArrowRight,
  Sparkles,
  Inbox,
} from "lucide-react";
import { JobCard } from "@/components/jobs/JobCard";
import { Button } from "@/components/ui/Button";
import {
  CATEGORY_LABELS,
  CATEGORY_SLUGS,
  type JobCategory,
} from "@/lib/validators/job";
import type { PublicJobCard } from "@/types/job";
import { Logo } from "@/components/ui/Logo";

// ─── Icon + tagline per category ──────────────────────────────────────
const CATEGORY_META: Record<
  JobCategory,
  {
    icon: React.ComponentType<{ className?: string }>;
    tagline: string;
    gradient: string;
  }
> = {
  ENGINEERING: {
    icon: Code2,
    tagline: "Build the products people use every day.",
    gradient: "from-indigo-500 to-violet-600",
  },
  DESIGN: {
    icon: Palette,
    tagline: "Shape how users feel when they open the product.",
    gradient: "from-pink-500 to-rose-600",
  },
  MARKETING: {
    icon: Megaphone,
    tagline: "Tell the story and drive growth.",
    gradient: "from-amber-500 to-orange-600",
  },
  SALES: {
    icon: TrendingUp,
    tagline: "Connect customers with real solutions.",
    gradient: "from-emerald-500 to-teal-600",
  },
  CUSTOMER_SUPPORT: {
    icon: Headphones,
    tagline: "Be the voice that customers trust.",
    gradient: "from-sky-500 to-blue-600",
  },
  FINANCE: {
    icon: Calculator,
    tagline: "Keep the numbers honest and the ship moving.",
    gradient: "from-teal-500 to-cyan-600",
  },
  OPERATIONS: {
    icon: Cog,
    tagline: "Make everything run smoother than yesterday.",
    gradient: "from-slate-500 to-gray-600",
  },
  HR: {
    icon: UserCircle2,
    tagline: "Hire and grow the people who build the future.",
    gradient: "from-fuchsia-500 to-purple-600",
  },
  OTHER: {
    icon: Layers,
    tagline: "Roles that don't fit the usual boxes.",
    gradient: "from-gray-500 to-gray-600",
  },
};

const supabase = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    description: `Browse active ${label.toLowerCase()} jobs on RealJobs. Every listing is verified weekly.`,
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
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  // Related categories — the 3 nearest siblings by index, skipping self.
  const allCategories = Object.entries(CATEGORY_SLUGS) as [
    string,
    JobCategory,
  ][];
  const relatedCategories = allCategories
    .filter(([slug]) => slug !== params.categorySlug)
    .slice(0, 3);

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

  const jobCount = jobs?.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* ─── Sticky glass header ─── */}
      <header className="sticky top-0 z-40 border-b border-gray-200/60 glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <Link
            href="/jobs"
            className="group inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            All jobs
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        {/* ─── Category hero ─── */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-card sm:p-8">
          <div
            className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br ${meta.gradient} opacity-10 blur-3xl`}
          />
          <div
            className={`pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-gradient-to-br ${meta.gradient} opacity-5 blur-3xl`}
          />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.gradient} text-white shadow-md`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Category</p>
                <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  {label} jobs
                </h1>
                <p className="mt-2 max-w-lg text-balance text-sm text-gray-600">
                  {meta.tagline}
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-100 pt-5 text-sm">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-gray-600">
                <strong className="text-gray-900">{jobCount}</strong> active{" "}
                {jobCount === 1 ? "role" : "roles"} right now
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>Verified weekly</span>
            </div>
          </div>
        </div>

        {/* ─── Jobs list ─── */}
        <div className="mt-8">
          {jobCount === 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-card">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/40 blur-3xl" />

              <div className="relative flex flex-col items-center gap-4">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.gradient} text-white shadow-sm`}
                >
                  <Inbox className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                    No {label.toLowerCase()} jobs right now
                  </h2>
                  <p className="mx-auto mt-2 max-w-sm text-balance text-sm text-gray-500">
                    We re-verify every listing weekly, so this category is
                    guaranteed to be empty rather than stale. Check back soon —
                    or explore another category below.
                  </p>
                </div>
                <Link href="/jobs">
                  <Button
                    variant="secondary"
                    iconRight={<ArrowRight className="h-4 w-4" />}
                  >
                    Browse all jobs
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {(jobs ?? []).map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>

        {/* ─── Related categories ─── */}
        <div className="mt-10 border-t border-gray-200 pt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Explore other categories
            </h2>
            <Link
              href="/jobs"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all jobs →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {relatedCategories.map(([slug, cat]) => {
              const catMeta = CATEGORY_META[cat];
              const CatIcon = catMeta.icon;
              return (
                <Link
                  key={slug}
                  href={`/jobs/category/${slug}`}
                  className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card-hover"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${catMeta.gradient} text-white shadow-sm`}
                  >
                    <CatIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">
                      {CATEGORY_LABELS[cat]}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Browse {CATEGORY_LABELS[cat].toLowerCase()} roles
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}