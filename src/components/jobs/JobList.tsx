import Link from "next/link";
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
  if (!jobs.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">{emptyMessage}</p>
        <Link href={emptyActionHref} className="mt-4 inline-block">
          <Button variant="secondary" size="sm">
            {emptyActionLabel}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}