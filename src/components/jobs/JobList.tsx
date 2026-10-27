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
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-card sm:p-12">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-100/30 blur-3xl" />

        <div className="relative flex flex-col items-center gap-4">
          {/* Icon tile */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600">
            <Inbox className="h-7 w-7" />
          </div>

          {/* Message + supporting hint */}
          <div>
            <p className="text-lg font-semibold tracking-tight text-gray-900">
              {emptyMessage}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-balance text-sm text-gray-500">
              New listings appear here as employers post them — check back soon.
            </p>
          </div>

          {/* CTA */}
          <Link href={emptyActionHref}>
            <Button
              variant="secondary"
              size="sm"
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {emptyActionLabel}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── List ───
  return (
    <div className="animate-fade-up space-y-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}