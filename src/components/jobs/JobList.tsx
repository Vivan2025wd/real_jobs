import Link from "next/link";
import { Inbox, ArrowRight } from "lucide-react";
import { JobCard } from "./JobCard";
import { Button } from "@/components/ui/Button";
import type { PublicJobCard } from "@/types/job";

type Props = {
  jobs: PublicJobCard[];
  emptyMessage?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
};

export function JobList({
  jobs,
  emptyMessage = "No jobs match your search.",
  emptyActionHref = "/jobs",
  emptyActionLabel = "Clear filters",
}: Props) {
  // ─── Empty state ───
  if (!jobs.length) {
    return (
      // මොබයිල් එකේදී පැඩින් අඩු කළා (p-6), ඩෙස්ක්ටොප් එකේදී sm:p-12
      <div className="relative w-full overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center shadow-card sm:rounded-2xl sm:p-12">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-100/30 blur-3xl" />

        <div className="relative flex flex-col items-center gap-3 sm:gap-4">
          {/* Icon tile - මොබයිල් එකේදී h-12 w-12 */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 sm:h-16 sm:w-16 sm:rounded-2xl">
            <Inbox className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>

          {/* Message + supporting hint */}
          <div>
            <p className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
              {emptyMessage}
            </p>
            <p className="mx-auto mt-1 max-w-[260px] text-balance text-xs text-gray-500 sm:mt-1.5 sm:max-w-sm sm:text-sm">
              New listings appear here as employers post them — check back soon.
            </p>
          </div>

          {/* CTA - මොබයිල් එකේදී w-full */}
          <div className="mt-1 w-full sm:mt-0 sm:w-auto">
            <Link href={emptyActionHref} className="block w-full sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                iconRight={<ArrowRight className="h-4 w-4" />}
                className="w-full justify-center sm:w-auto"
              >
                {emptyActionLabel}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── List ───
  return (
    // Job Cards අතරේ තියෙන පරතරය මොබයිල් එකේදී space-y-2.5 කළා
    <div className="animate-fade-up w-full space-y-2.5 sm:space-y-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}