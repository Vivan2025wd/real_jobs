"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkUpdateApplications, type BulkApplicationStatus } from "@/app/actions/employer-applications";
import { ApplicationStatusSelect } from "@/components/employer/ApplicationStatusSelect";
import { ViewResumeButton } from "@/components/employer/ViewResumeButton";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/utils/format";
import type { ApplicationWithSeeker } from "@/types/job";

type Props = {
  jobId: string;
  applications: ApplicationWithSeeker[];
  onUpdateStatus: (formData: FormData) => Promise<void>;
};

export function ApplicationListManager({
  jobId,
  applications,
  onUpdateStatus,
}: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<BulkApplicationStatus | null>(
    null
  );
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const confirmationRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (confirmation) confirmationRef.current?.focus();
  }, [confirmation]);

  const pendingIds = useMemo(
    () =>
      applications
        .filter((application) => application.status === "PENDING")
        .map((application) => application.id),
    [applications]
  );
  const allPendingSelected =
    pendingIds.length > 0 && pendingIds.every((id) => selectedIds.includes(id));

  function toggleApplication(id: string) {
    setSelectedIds((selected) =>
      selected.includes(id)
        ? selected.filter((selectedId) => selectedId !== id)
        : [...selected, id]
    );
  }

  function toggleAllPending() {
    setSelectedIds((selected) =>
      allPendingSelected
        ? selected.filter((id) => !pendingIds.includes(id))
        : [...new Set([...selected, ...pendingIds])]
    );
  }

  async function applyBulkStatus() {
    if (!confirmation || selectedIds.length === 0) return;

    setWorking(true);
    setToast(null);
    try {
      const result = await bulkUpdateApplications(
        jobId,
        selectedIds,
        confirmation
      );
      if (!result.success) {
        setToast({ type: "error", message: result.message });
        setConfirmation(null);
        return;
      }

      const emailMessage =
        result.emailFailures > 0
          ? ` ${result.emailFailures} notification email${result.emailFailures === 1 ? "" : "s"} could not be sent.`
          : "";
      setToast({
        type: "success",
        message: `Updated ${result.updated} application${result.updated === 1 ? "" : "s"}.${emailMessage}`,
      });
      setSelectedIds([]);
      setConfirmation(null);
      router.refresh();
    } catch (error) {
      console.error("[ApplicationListManager] Bulk update failed:", error);
      setConfirmation(null);
      setToast({
        type: "error",
        message: "The applications could not be updated. Please try again.",
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
          className={`m-3 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs sm:mx-6 sm:mt-4 sm:text-sm ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="rounded px-2 py-1 font-medium hover:bg-black/5"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 border-b border-gray-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <label className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-gray-700 sm:min-h-0 sm:text-sm">
          <input
            type="checkbox"
            checked={allPendingSelected}
            onChange={toggleAllPending}
            disabled={pendingIds.length === 0 || working}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Select all pending
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-gray-500" aria-live="polite">
            {selectedIds.length} selected
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={selectedIds.length === 0 || working}
            onClick={() => setConfirmation("REVIEWED")}
          >
            Review selected
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={selectedIds.length === 0 || working}
            onClick={() => setConfirmation("SHORTLISTED")}
          >
            Shortlist selected
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={selectedIds.length === 0 || working}
            onClick={() => setConfirmation("REJECTED")}
          >
            Reject selected
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-gray-100">
        {applications.map((application) => (
          <li
            key={application.id}
            className="flex flex-col gap-2.5 px-3 py-3.5 transition hover:bg-gray-50/60 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4"
          >
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <input
                type="checkbox"
                checked={selectedIds.includes(application.id)}
                onChange={() => toggleApplication(application.id)}
                disabled={working || application.status === "WITHDRAWN"}
                aria-label={`Select application from ${application.users.full_name?.trim() || application.users.email}`}
                className="h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-semibold text-indigo-700 sm:h-10 sm:w-10 sm:text-sm">
                {(application.users.full_name?.trim() || application.users.email)
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 sm:text-base">
                  {application.users.full_name?.trim() || application.users.email}
                </p>
                <p className="text-[10px] text-gray-500 sm:text-xs">
                  Applied {timeAgo(application.applied_at)}
                </p>
                {application.cover_letter && (
                  <details className="mt-1 max-w-xl text-xs text-gray-600">
                    <summary className="cursor-pointer font-medium text-indigo-700">
                      View cover letter
                    </summary>
                    <p className="mt-1 whitespace-pre-line leading-relaxed">
                      {application.cover_letter}
                    </p>
                  </details>
                )}
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 pl-10 sm:w-auto sm:shrink-0 sm:gap-3 sm:pl-0">
              <ApplicationStatusSelect
                applicationId={application.id}
                currentStatus={application.status}
                onUpdate={onUpdateStatus}
              />
              <ViewResumeButton applicationId={application.id} />
            </div>
          </li>
        ))}
      </ul>

      {confirmation && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/40 p-4"
          onKeyDown={(event) => {
            if (event.key === "Escape" && !working) setConfirmation(null);
          }}
        >
          <section
            ref={confirmationRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bulk-application-title"
            aria-describedby="bulk-application-description"
            tabIndex={-1}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl outline-none"
          >
            <h2
              id="bulk-application-title"
              className="text-base font-semibold text-gray-900"
            >
              Confirm application update
            </h2>
            <p
              id="bulk-application-description"
              className="mt-2 text-sm leading-relaxed text-gray-600"
            >
              {confirmation === "REJECTED"
                ? "Reject"
                : confirmation === "SHORTLISTED"
                  ? "Shortlist"
                  : "Mark for review"}{" "}
              {selectedIds.length} selected application
              {selectedIds.length === 1 ? "" : "s"}?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={working}
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmation === "REJECTED" ? "danger" : "primary"}
                size="sm"
                disabled={working}
                onClick={applyBulkStatus}
              >
                {working ? "Updating…" : "Confirm"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
