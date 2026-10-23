import Link from "next/link";
import { formatSalary, timeAgo } from "@/lib/utils/format";
import type { PublicJobCard } from "@/types/job";

export function JobCard({ job }: { job: PublicJobCard }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {job.companies.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.companies.logo_url}
              alt={job.companies.company_name}
              className="h-10 w-10 rounded-lg border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">
              {job.companies.company_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{job.title}</h3>
            <p className="text-sm text-gray-500">{job.companies.company_name}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          {job.work_type.charAt(0) + job.work_type.slice(1).toLowerCase()}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
        <span>📍 {job.location}</span>
        <span>💰 {formatSalary(job.salary_min, job.salary_max)}</span>
        {job.category && (
          <span className="text-gray-400">·</span>
        )}
        {job.category && (
          <span className="text-gray-500">
            {job.category.charAt(0) + job.category.slice(1).toLowerCase().replace("_", " ")}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-400">
        Posted {timeAgo(job.created_at)}
      </p>
    </Link>
  );
}