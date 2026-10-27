import Link from "next/link";
import { MapPin, Banknote, Clock, ArrowUpRight } from "lucide-react";
import { formatSalary, timeAgo } from "@/lib/utils/format";
import type { PublicJobCard } from "@/types/job";

const WORK_TYPE_LABEL: Record<string, string> = {
  REMOTE: "Remote",
  ONSITE: "On-site",
  HYBRID: "Hybrid",
};

export function JobCard({ job }: { job: PublicJobCard }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group relative block overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {job.companies.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.companies.logo_url}
              alt={job.companies.company_name}
              className="h-12 w-12 shrink-0 rounded-xl border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-semibold text-white shadow-sm">
              {job.companies.company_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-semibold tracking-tight text-gray-900 group-hover:text-indigo-700">
              {job.title}
            </h3>
            <p className="truncate text-sm text-gray-500">
              {job.companies.company_name}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
          {WORK_TYPE_LABEL[job.work_type] ?? job.work_type}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-gray-400" />
          {job.location}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Banknote className="h-4 w-4 text-gray-400" />
          {formatSalary(job.salary_min, job.salary_max)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-gray-400">
          <Clock className="h-4 w-4" />
          {timeAgo(job.created_at)}
        </span>
      </div>

      {job.category && (
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
            {job.category.charAt(0) +
              job.category.slice(1).toLowerCase().replace("_", " ")}
          </span>
        </div>
      )}

      <ArrowUpRight className="absolute right-5 top-5 h-4 w-4 text-gray-300 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-500 group-hover:opacity-100" />
    </Link>
  );
}