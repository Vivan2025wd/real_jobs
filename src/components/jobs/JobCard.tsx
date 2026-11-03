import Link from "next/link";
import { MapPin, Banknote, Clock, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ResponseRateBadge } from "@/components/employer/ResponseRateBadge";
import { formatSalary, timeAgo } from "@/lib/utils/format";
import { isExternalUnclaimed, publicCompanyName, type PublicJobCard } from "@/types/job";

const WORK_TYPE_LABEL: Record<string, string> = {
  REMOTE: "Remote",
  ONSITE: "On-site",
  HYBRID: "Hybrid",
};

export function JobCard({ job }: { job: PublicJobCard }) {
  const companyName = publicCompanyName(job);
  const sourcedUnclaimed = isExternalUnclaimed(job);
  const workTypeLabel = WORK_TYPE_LABEL[job.work_type] ?? job.work_type;
  const categoryLabel = job.category
    ? job.category.charAt(0) +
      job.category.slice(1).toLowerCase().replace("_", " ")
    : null;

  return (
    <article className="group relative w-full rounded-xl border border-gray-200 bg-white p-3.5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card-hover sm:p-5">
      <Link
        href={`/jobs/${job.id}`}
        aria-label={`${job.title} at ${companyName}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
      />
      <div className="pointer-events-none relative z-10">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-4">
          
          {/* ලෝගෝ එක මොබයිල් එකේදී h-10 w-10 */}
          {job.companies.logo_url && !sourcedUnclaimed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.companies.logo_url}
              alt={companyName}
              className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 object-cover sm:h-12 sm:w-12 sm:rounded-xl"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-sm sm:h-12 sm:w-12 sm:rounded-xl sm:text-base">
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="min-w-0">
            {/* ටයිටල් එක මොබයිල් එකේදී text-sm */}
            <h3 className="truncate text-sm font-semibold tracking-tight text-gray-900 group-hover:text-indigo-700 sm:text-base">
              {job.title}
            </h3>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 sm:mt-0">
              <p className="truncate text-xs text-gray-500 sm:text-sm">
                {companyName}
              </p>
              {!sourcedUnclaimed && (
                <ResponseRateBadge
                  totalApplications90d={job.companies.total_applications_90d}
                  respondedApplications90d={job.companies.responded_applications_90d}
                  averageResponseHours={job.companies.avg_response_hours}
                  variant="compact"
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Desktop-only work type badge (top right) */}
        <span className="hidden shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 sm:inline-flex">
          {workTypeLabel}
        </span>
      </div>

      {/* ─── Badges Row (Both Mobile & Desktop) ─── */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
        {/* Mobile-only work type badge */}
        <span className="inline-flex sm:hidden">
          <Badge tone="blue">{workTypeLabel}</Badge>
        </span>
        {categoryLabel && <Badge tone="gray">{categoryLabel}</Badge>}
        {sourcedUnclaimed && (
          <a
            href={job.source_url ?? undefined}
            target="_blank"
            rel="nofollow noopener"
            aria-label="View original job source"
            className="pointer-events-auto relative z-20 inline-flex rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-200 sm:text-xs"
          >
            Sourced listing · employer not yet verified
          </a>
        )}
      </div>

      {/* ─── Metadata (Location, Salary, Time) ─── */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-600 sm:mt-4 sm:gap-x-4 sm:text-sm">
        <span className="inline-flex items-center gap-1 sm:gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400 sm:h-4 sm:w-4" />
          {job.location}
        </span>
        <span className="inline-flex items-center gap-1 sm:gap-1.5">
          <Banknote className="h-3.5 w-3.5 shrink-0 text-gray-400 sm:h-4 sm:w-4" />
          {formatSalary(job.salary_min, job.salary_max)}
        </span>
        <span className="inline-flex items-center gap-1 text-gray-400 sm:gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          {timeAgo(job.created_at)}
        </span>
      </div>

      {/* Hover Arrow Icon */}
      <ArrowUpRight className="absolute right-3.5 top-3.5 h-4 w-4 text-gray-300 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-500 group-hover:opacity-100 sm:right-5 sm:top-5" />
      </div>
    </article>
  );
}