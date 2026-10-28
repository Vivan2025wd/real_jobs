"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
};

export function ApplicationStatusSelect({
  applicationId,
  currentStatus,
  onUpdate,
}: {
  applicationId: string;
  currentStatus: string;
  onUpdate: (formData: FormData) => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        fd.set("applicationId", applicationId);
        startTransition(async () => {
          await onUpdate(fd);
        });
      }}
      className="flex items-center gap-1.5"
    >
      <select
        name="status"
        defaultValue={currentStatus}
        onChange={(e) => {
          // Only submit if the value actually changed
          if (e.target.value !== currentStatus) {
            e.currentTarget.form?.requestSubmit();
          }
        }}
        disabled={pending}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-wait disabled:opacity-60"
      >
        <option value="PENDING">Pending</option>
        <option value="REVIEWED">Reviewed</option>
        <option value="SHORTLISTED">Shortlisted</option>
        <option value="REJECTED">Rejected</option>
      </select>
      {pending && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
      )}
    </form>
  );
}