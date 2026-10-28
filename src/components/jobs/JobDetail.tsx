import dynamic from "next/dynamic";
import {
  MapPin,
  Banknote,
  Clock,
  Calendar,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Sparkles,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatSalary, formatDate, timeAgo } from "@/lib/utils/format";
import type { PublicJobDetail } from "@/types/job";

// ---------------------------------------------------------------------------
// ApplyButton is lazy-loaded.
//
// It's a Client Component that pulls in @supabase/supabase-js (~70 kB). By
// deferring the import, visitors who only read the page never pay for it in
// the initial JS bundle. The server-rendered HTML shows a lightweight
// fallback; the real button hydrates as soon as the chunk arrives.
// ---------------------------------------------------------------------------
const ApplyButton = dynamic(
  () =>
    import("@/components/applications/ApplyButton").then((m) => ({
      default: m.ApplyButton,
    })),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        disabled
        className="w-full cursor-wait rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white opacity-60 shadow-sm"
      >
        Loading…
      </button>
    ),
  }
);

const WORK_TYPE_LABEL: Record<string, string> = {
  REMOTE: "Remote",
  ONSITE: "On-site",
  HYBRID: "Hybrid",
};

type Props = {
  job: PublicJobDetail & { status?: string };
};

export function JobDetail({ job }: Props) {
  const company = job.companies;

  return (
    <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1fr_340px]">
      {/* ═══════════════ Main column ═══════════════ */}
      <main className="space-y-6">
        {/* ─── Hero card ─── */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-card sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/40 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* Company avatar */}
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={company.company_name}
                className="h-14 w-14 shrink-0 rounded-2xl border border-gray-200 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white shadow-md">
                {company.company_name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {job.title}
              </h1>

              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-base text-gray-700">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{company.company_name}</span>
                {company.is_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* ─── Metadata badge grid ─── */}
          <div className="relative mt-6 flex flex-wrap items-center gap-2">
            <Badge tone="blue">
              {WORK_TYPE_LABEL[job.work_type] ?? job.work_type}
            </Badge>
            {job.category && (
              <Badge tone="gray">
                {job.category.charAt(0) +
                  job.category.slice(1).toLowerCase().replace("_", " ")}
              </Badge>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
              <MapPin className="h-3 w-3 text-gray-400" />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
              <Banknote className="h-3 w-3 text-gray-400" />
              {formatSalary(job.salary_min, job.salary_max)}
            </span>
          </div>

          {/* ─── Date row ─── */}
          <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Posted {formatDate(job.created_at)}
            </span>
            {job.last_verified_at && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Last verified {timeAgo(job.last_verified_at)}
              </span>
            )}
          </div>
        </div>

        {/* ─── Description ─── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">
              About the role
            </h2>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-700">
            {job.description}
          </p>
        </section>

        {/* ─── About company ─── */}
        {company.description && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-3">
              {company.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logo_url}
                  alt={company.company_name}
                  className="h-10 w-10 rounded-xl border border-gray-200 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                  {company.company_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-gray-900">
                  About {company.company_name}
                </h2>
                {company.is_verified && (
                  <p className="text-xs text-emerald-600">
                    ✓ Verified employer
                  </p>
                )}
              </div>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-700">
              {company.description}
            </p>
          </section>
        )}
      </main>

      {/* ═══════════════ Sidebar ═══════════════ */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {/* ─── Apply CTA ─── */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-card">
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-200/40 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-indigo-900">
                Interested in this role?
              </h2>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Applications are managed inside RealJobs. You&apos;ll need a
              resume on file to apply.
            </p>
            <div className="mt-5">
              <ApplyButton jobId={job.id} />
            </div>
          </div>
        </div>

        {/* ─── Details ─── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold text-gray-900">Job details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-gray-500">
                <Clock className="h-4 w-4 text-gray-400" />
                Work type
              </dt>
              <dd className="text-right font-medium text-gray-900">
                {WORK_TYPE_LABEL[job.work_type] ?? job.work_type}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-gray-500">
                <MapPin className="h-4 w-4 text-gray-400" />
                Location
              </dt>
              <dd className="text-right font-medium text-gray-900">
                {job.location}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-gray-500">
                <Banknote className="h-4 w-4 text-gray-400" />
                Salary
              </dt>
              <dd className="text-right font-medium text-gray-900">
                {formatSalary(job.salary_min, job.salary_max)}
              </dd>
            </div>
            {job.category && (
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  Category
                </dt>
                <dd className="text-right font-medium text-gray-900">
                  {job.category.charAt(0) +
                    job.category.slice(1).toLowerCase().replace("_", " ")}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* ─── Trust signal ─── */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-900">
                Verified listing
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-emerald-800">
                {job.last_verified_at
                  ? `Employer confirmed this role is still open ${timeAgo(
                      job.last_verified_at
                    )}.`
                  : "This listing is re-verified with the employer every 14 days."}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}