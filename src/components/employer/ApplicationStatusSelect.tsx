"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "REJECTED", label: "Rejected" },
] as const;

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
      {/* Hidden submit button — required for requestSubmit() to work
          reliably across all browsers when using React Server Actions */}
      <button type="submit" className="hidden" aria-hidden="true" />

      <select
        name="status"
        // Using key ensures React fully remounts the select when the server
        // re-renders with a new currentStatus. Without this, a failed action
        // leaves the select in an inconsistent state until a hard refresh.
        key={currentStatus}
        defaultValue={currentStatus}
        onChange={(e) => {
          if (e.target.value !== currentStatus) {
            e.currentTarget.form?.requestSubmit();
          }
        }}
        disabled={pending}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-wait disabled:opacity-60"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {pending && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
      )}
    </form>
  );
}