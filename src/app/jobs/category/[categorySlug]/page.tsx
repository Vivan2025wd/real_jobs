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
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* ─── Sticky glass header ─── */}
      <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:h-16 sm:px-4">
          <Logo size="sm" />
          <Link
            href="/jobs"
            className="group inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5 sm:h-4 sm:w-4" />
            All jobs
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-4 sm:py-10">
        {/* ─── Category hero ─── */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3.5 shadow-card sm:rounded-2xl sm:p-6 lg:p-8">
          <div
            className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br ${meta.gradient} opacity-10 blur-3xl`}
          />
          <div
            className={`pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-gradient-to-br ${meta.gradient} opacity-5 blur-3xl`}
          />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-white shadow-md sm:h-14 sm:w-14 sm:rounded-2xl`}
              >
                <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 sm:text-sm">Category</p>
                <h1 className="mt-0.5 text-balance text-xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
                  {label} jobs
                </h1>
                <p className="mt-1 max-w-lg text-balance text-xs text-gray-600 sm:mt-2 sm:text-sm">
                  {meta.tagline}
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-gray-100 pt-3 text-xs sm:mt-6 sm:gap-x-6 sm:gap-y-2 sm:pt-5 sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 sm:h-2 sm:w-2" />
              </span>
              <span className="text-gray-600">
                <strong className="text-gray-900">{jobCount}</strong> active{" "}
                {jobCount === 1 ? "role" : "roles"} right now
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 sm:gap-1.5">
              <Sparkles className="h-3 w-3 text-indigo-500 sm:h-3.5 sm:w-3.5" />
              <span>Verified weekly</span>
            </div>
          </div>
        </div>

        {/* ─── Jobs list ─── */}
        <div className="mt-5 sm:mt-8">
          {jobCount === 0 ? (
            <div className="relative overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center shadow-card sm:rounded-2xl sm:p-12">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/40 blur-3xl" />

              <div className="relative flex flex-col items-center gap-3 sm:gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-white shadow-sm sm:h-16 sm:w-16 sm:rounded-2xl`}
                >
                  <Inbox className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-gray-900 sm:text-xl">
                    No {label.toLowerCase()} jobs right now
                  </h2>
                  <p className="mx-auto mt-1 max-w-[260px] text-balance text-xs text-gray-500 sm:mt-2 sm:max-w-sm sm:text-sm">
                    We re-verify every listing weekly, so this category is
                    guaranteed to be empty rather than stale. Check back soon —
                    or explore another category below.
                  </p>
                </div>
                <div className="mt-1 w-full sm:w-auto">
                  <Link href="/jobs" className="block w-full">
                    <Button
                      variant="secondary"
                      iconRight={<ArrowRight className="h-4 w-4" />}
                      className="w-full justify-center sm:w-auto"
                    >
                      Browse all jobs
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {(jobs ?? []).map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>

        {/* ─── Related categories ─── */}
        <div className="mt-8 border-t border-gray-200 pt-6 sm:mt-10 sm:pt-8">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 sm:text-sm">
              Explore other categories
            </h2>
            <Link
              href="/jobs"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 sm:text-sm"
            >
              View all jobs →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {relatedCategories.map(([slug, cat]) => {
              const catMeta = CATEGORY_META[cat];
              const CatIcon = catMeta.icon;
              return (
                <Link
                  key={slug}
                  href={`/jobs/category/${slug}`}
                  className="group flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-3 shadow-card transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card-hover sm:gap-3 sm:p-4"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${catMeta.gradient} text-white shadow-sm sm:h-10 sm:w-10`}
                  >
                    <CatIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-700">
                      {CATEGORY_LABELS[cat]}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-gray-500 sm:text-xs">
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