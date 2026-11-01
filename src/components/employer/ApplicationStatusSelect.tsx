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
      className="flex w-full items-center gap-2 sm:w-auto sm:gap-1.5"
    >
      {/* Hidden submit button — required for requestSubmit() to work
          reliably across all browsers when using React Server Actions */}
      <button type="submit" className="hidden" aria-hidden="true" />

      <select
        name="status"
        key={currentStatus}
        defaultValue={currentStatus}
        onChange={(e) => {
          if (e.target.value !== currentStatus) {
            e.currentTarget.form?.requestSubmit();
          }
        }}
        disabled={pending}
        // මොබයිල් එකේදී ලොකුවට (py-2 text-sm), ඩෙස්ක්ටොප් එකේදී පොඩියට (sm:py-1 sm:text-xs)
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:rounded-md sm:px-2 sm:py-1 sm:text-xs"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      
      {pending && (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-600 sm:h-3.5 sm:w-3.5" />
      )}
    </form>
  );
}