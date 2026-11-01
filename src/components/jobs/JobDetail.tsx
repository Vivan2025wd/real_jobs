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
// ---------------------------------------------------------------------------
const ApplyButton = dynamic(
  () =>
    import("@/components/applications/ApplyButton").then((m) => ({
      default: m.ApplyButton,
    })),
  {
    ssr: false,
    loading: () => (
      // Fallback බටන් එකත් මොබයිල් ෆ්‍රෙන්ඩ්ලි කළා
      <button
        type="button"
        disabled
        className="w-full cursor-wait rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white opacity-60 shadow-sm sm:py-3 sm:text-sm"
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
    <div className="grid w-full gap-4 sm:gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
      {/* ═══════════════ Main column ═══════════════ */}
      <main className="min-w-0 space-y-4 sm:space-y-6">
        {/* ─── Hero card ─── */}
        <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-3.5 shadow-card sm:rounded-2xl sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/40 blur-3xl" />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
            {/* Company avatar - මොබයිල් එකේදී h-12 w-12 */}
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={company.company_name}
                className="h-12 w-12 shrink-0 rounded-xl border border-gray-200 object-cover shadow-sm sm:h-14 sm:w-14 sm:rounded-2xl"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-md sm:h-14 sm:w-14 sm:rounded-2xl sm:text-xl">
                {company.company_name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              {/* ටයිටල් එක මොබයිල් එකේදී text-xl */}
              <h1 className="text-balance text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">
                {job.title}
              </h1>

              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-700 sm:mt-1.5 sm:gap-2 sm:text-base">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400 sm:h-4 sm:w-4" />
                <span className="font-medium">{company.company_name}</span>
                {company.is_verified && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200 sm:gap-1 sm:px-2 sm:text-xs">
                    <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    Verified
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* ─── Metadata badge grid ─── */}
          <div className="relative mt-4 flex flex-wrap items-center gap-1.5 sm:mt-6 sm:gap-2">
            <Badge tone="blue">
              {WORK_TYPE_LABEL[job.work_type] ?? job.work_type}
            </Badge>
            {job.category && (
              <Badge tone="gray">
                {job.category.charAt(0) +
                  job.category.slice(1).toLowerCase().replace("_", " ")}
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs">
              <MapPin className="h-2.5 w-2.5 text-gray-400 sm:h-3 sm:w-3" />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs">
              <Banknote className="h-2.5 w-2.5 text-gray-400 sm:h-3 sm:w-3" />
              {formatSalary(job.salary_min, job.salary_max)}
            </span>
          </div>

          {/* ─── Date row ─── */}
          <div className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 sm:mt-4 sm:gap-x-4 sm:text-xs">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
              Posted {formatDate(job.created_at)}
            </span>
            {job.last_verified_at && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                Last verified {timeAgo(job.last_verified_at)}
              </span>
            )}
          </div>
        </div>

        {/* ─── Description ─── */}
        <section className="w-full rounded-xl border border-gray-200 bg-white p-3.5 shadow-card sm:rounded-2xl sm:p-6 lg:p-8">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <FileText className="h-3.5 w-3.5 text-gray-400 sm:h-4 sm:w-4" />
            <h2 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
              About the role
            </h2>
          </div>
          <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-gray-700 sm:mt-4 sm:text-sm">
            {job.description}
          </p>
        </section>

        {/* ─── About company ─── */}
        {company.description && (
          <section className="w-full rounded-xl border border-gray-200 bg-white p-3.5 shadow-card sm:rounded-2xl sm:p-6 lg:p-8">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {company.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logo_url}
                  alt={company.company_name}
                  className="h-8 w-8 rounded-lg border border-gray-200 object-cover sm:h-10 sm:w-10 sm:rounded-xl"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm">
                  {company.company_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                  About {company.company_name}
                </h2>
                {company.is_verified && (
                  <p className="text-[10px] text-emerald-600 sm:text-xs">
                    ✓ Verified employer
                  </p>
                )}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-gray-700 sm:mt-4 sm:text-sm">
              {company.description}
            </p>
          </section>
        )}
      </main>

      {/* ═══════════════ Sidebar ═══════════════ */}
      <aside className="w-full space-y-3 sm:space-y-4 lg:sticky lg:top-24 lg:self-start">
        {/* ─── Apply CTA ─── */}
        <div className="relative w-full overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-3.5 shadow-card sm:rounded-2xl sm:p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-200/40 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 sm:h-4 sm:w-4" />
              <h2 className="text-xs font-semibold text-indigo-900 sm:text-sm">
                Interested in this role?
              </h2>
            </div>
            <p className="mt-1.5 text-xs text-gray-600 sm:mt-2 sm:text-sm">
              Applications are managed inside RealJobs. You&apos;ll need a
              resume on file to apply.
            </p>
            <div className="mt-4 sm:mt-5">
              <ApplyButton jobId={job.id} />
            </div>
          </div>
        </div>

        {/* ─── Details ─── */}
        <div className="w-full rounded-xl border border-gray-200 bg-white p-3.5 shadow-card sm:rounded-2xl sm:p-6">
          <h2 className="text-xs font-semibold text-gray-900 sm:text-sm">Job details</h2>
          <dl className="mt-3 space-y-2.5 text-xs sm:mt-4 sm:space-y-3 sm:text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-gray-500 sm:gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400 sm:h-4 sm:w-4" />
                Work type
              </dt>
              <dd className="text-right font-medium text-gray-900">
                {WORK_TYPE_LABEL[job.work_type] ?? job.work_type}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-gray-500 sm:gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400 sm:h-4 sm:w-4" />
                Location
              </dt>
              <dd className="text-right font-medium text-gray-900">
                {job.location}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-gray-500 sm:gap-2">
                <Banknote className="h-3.5 w-3.5 shrink-0 text-gray-400 sm:h-4 sm:w-4" />
                Salary
              </dt>
              <dd className="text-right font-medium text-gray-900">
                {formatSalary(job.salary_min, job.salary_max)}
              </dd>
            </div>
            {job.category && (
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-gray-500 sm:gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400 sm:h-4 sm:w-4" />
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
        <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-sm sm:rounded-2xl sm:p-4">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200 sm:h-8 sm:w-8">
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-emerald-900 sm:text-xs">
                Verified listing
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-800 sm:text-xs">
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