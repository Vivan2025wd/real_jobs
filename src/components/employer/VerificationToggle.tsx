"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/utils/format";

export function VerificationToggle({
  jobId,
  lastVerifiedAt,
  onConfirm,
  onMarkFilled,
}: {
  jobId: string;
  lastVerifiedAt: string | null;
  onConfirm: (formData: FormData) => void | Promise<void>;
  onMarkFilled: (formData: FormData) => void | Promise<void>;
}) {
  const [pendingConfirm, startConfirm] = useTransition();
  const [pendingFill, startFill] = useTransition();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Verification status
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {lastVerifiedAt
              ? `Last verified ${timeAgo(lastVerifiedAt)}`
              : "Never verified"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form
            action={(fd) => {
              fd.set("jobId", jobId);
              startConfirm(async () => {
                await onConfirm(fd);
              });
            }}
          >
            <Button type="submit" size="sm" disabled={pendingConfirm}>
              {pendingConfirm ? "Confirming…" : "Confirm still hiring"}
            </Button>
          </form>

          <form
            action={(fd) => {
              fd.set("jobId", jobId);
              startFill(async () => {
                await onMarkFilled(fd);
              });
            }}
          >
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={pendingFill}
            >
              {pendingFill ? "Updating…" : "Mark as filled"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}