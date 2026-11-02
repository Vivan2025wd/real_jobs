"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function PendingApplicationsNotice({
  jobId,
  count,
}: {
  jobId: string;
  count: number;
}) {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `realjobs:stale-applications-dismissed:${jobId}`;

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(storageKey) === "true");
    } catch (error) {
      console.error("[PendingApplicationsNotice] Session storage unavailable:", error);
    }
  }, [storageKey]);

  if (dismissed || count === 0) return null;

  function dismiss() {
    try {
      window.sessionStorage.setItem(storageKey, "true");
    } catch (error) {
      console.error("[PendingApplicationsNotice] Could not save dismissal:", error);
    }
    setDismissed(true);
  }

  return (
    <aside
      role="status"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950 shadow-sm sm:p-4"
    >
      <p className="min-w-0 flex-1 text-xs leading-relaxed sm:text-sm">
        <strong>
          {count} application{count === 1 ? "" : "s"} have been waiting over 7
          days.
        </strong>{" "}
        Responding quickly improves your visibility on RealJobs.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss pending applications reminder"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-amber-800 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </aside>
  );
}
