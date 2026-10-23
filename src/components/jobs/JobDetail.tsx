import dynamic from "next/dynamic";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { formatSalary, formatDate, timeAgo } from "@/lib/utils/format";
import type { PublicJobDetail } from "@/types/job";

// ---------------------------------------------------------------------------
// ApplyButton is lazy-loaded.
//
// It's a Client Component that pulls in @supabase/supabase-js (~70 kB). By
// deferring the import, visitors who only read the page never pay for it in
// the initial JS bundle. The server-rendered HTML shows the lightweight
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
        className="w-full cursor-wait rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-60 shadow-sm"
      >
        Loading…
      </button>
    ),
  }
);

type Props = {
  job: PublicJobDetail & { status?: string };
};

export function JobDetail({ job }: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <main className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            {job.status && <StatusBadge status={job.status} />}
          </div>
          <p className="mt-2 text-lg text-gray-700">
            {job.companies.company_name}
            {job.companies.is_verified && (
              <span className="ml-2 text-sm text-blue-600">✓ Verified</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <span>📍 {job.location}</span>
            <span>💰 {formatSalary(job.salary_min, job.salary_max)}</span>
            <Badge tone="blue">
              {job.work_type.charAt(0) + job.work_type.slice(1).toLowerCase()}
            </Badge>
            {job.category && (
              <Badge tone="gray">
                {job.category.charAt(0) +
                  job.category.slice(1).toLowerCase().replace("_", " ")}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Posted {formatDate(job.created_at)}
            {job.last_verified_at && (
              <> · Last verified {timeAgo(job.last_verified_at)}</>
            )}
          </p>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Job description
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
            {job.description}
          </p>
        </section>

        {job.companies.description && (
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              About {job.companies.company_name}
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
              {job.companies.description}
            </p>
          </section>
        )}
      </main>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Interested in this role?
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Applications are managed inside HireLoop. You&apos;ll need a resume
            on file to apply.
          </p>
          <div className="mt-4">
            <ApplyButton jobId={job.id} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Work type</dt>
              <dd className="font-medium text-gray-900">
                {job.work_type.charAt(0) +
                  job.work_type.slice(1).toLowerCase()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Location</dt>
              <dd className="font-medium text-gray-900">{job.location}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Salary</dt>
              <dd className="text-right font-medium text-gray-900">
                {formatSalary(job.salary_min, job.salary_max)}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}