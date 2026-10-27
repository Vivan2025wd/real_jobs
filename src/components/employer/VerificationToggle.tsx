"use client";

import { useTransition } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  Clock,
  Info,
  RefreshCw,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Verification freshness states.
//
// The platform re-verifies every 14 days. We surface that cycle visually:
//   • <  7 days since last verification → "Fresh"    (emerald)
//   • 7–13 days                        → "Aging"    (amber)
//   • 14+ days or never verified       → "Overdue"  (rose)
//
// This makes the toggle informative, not just a pair of buttons.
// ---------------------------------------------------------------------------
type Freshness = "fresh" | "aging" | "overdue";

const FRESH_THRESHOLD_DAYS = 7;
const OVERDUE_THRESHOLD_DAYS = 14;

function getFreshness(lastVerifiedAt: string | null): {
  state: Freshness;
  daysSince: number | null;
} {
  if (!lastVerifiedAt) return { state: "overdue", daysSince: null };
  const daysSince = Math.floor(
    (Date.now() - new Date(lastVerifiedAt).getTime()) / 86_400_000
  );
  if (daysSince >= OVERDUE_THRESHOLD_DAYS) return { state: "overdue", daysSince };
  if (daysSince >= FRESH_THRESHOLD_DAYS) return { state: "aging", daysSince };
  return { state: "fresh", daysSince };
}

const FRESHNESS_META: Record<
  Freshness,
  {
    icon: typeof ShieldCheck;
    label: string;
    tone: string;
    toneBg: string;
    toneText: string;
    toneRing: string;
    hint: string;
  }
> = {
  fresh: {
    icon: ShieldCheck,
    label: "Fresh",
    tone: "text-emerald-600",
    toneBg: "bg-emerald-50",
    toneText: "text-emerald-700",
    toneRing: "ring-emerald-200",
    hint: "Recently verified. Your listing will be re-checked automatically.",
  },
  aging: {
    icon: ShieldAlert,
    label: "Aging",
    tone: "text-amber-600",
    toneBg: "bg-amber-50",
    toneText: "text-amber-700",
    toneRing: "ring-amber-200",
    hint: "Verification is coming up. Confirm now to keep the listing fresh.",
  },
  overdue: {
    icon: ShieldX,
    label: "Overdue",
    tone: "text-rose-600",
    toneBg: "bg-rose-50",
    toneText: "text-rose-700",
    toneRing: "ring-rose-200",
    hint: "We haven't verified this listing recently. Confirm it's still open.",
  },
};

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

  const { state, daysSince } = getFreshness(lastVerifiedAt);
  const meta = FRESHNESS_META[state];
  const StatusIcon = meta.icon;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        {/* ─── Left: status ─── */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.toneBg} ${meta.tone} ring-1 ${meta.toneRing}`}
          >
            <StatusIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tracking-tight text-gray-900">
                Verification
              </p>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${meta.toneBg} ${meta.toneText} ${meta.toneRing}`}
              >
                {meta.label}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3 w-3 text-gray-400" />
              {lastVerifiedAt
                ? `Last verified ${timeAgo(lastVerifiedAt)}${
                    daysSince !== null && daysSince > 0
                      ? ` · ${daysSince} day${daysSince === 1 ? "" : "s"} ago`
                      : ""
                  }`
                : "Never verified — confirm to keep this listing visible"}
            </p>
            <p className="mt-1 text-xs text-gray-500">{meta.hint}</p>
          </div>
        </div>

        {/* ─── Right: actions ─── */}
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <form
            action={(fd) => {
              fd.set("jobId", jobId);
              startConfirm(async () => {
                await onConfirm(fd);
              });
            }}
          >
            <Button
              type="submit"
              size="sm"
              disabled={pendingConfirm}
              icon={
                pendingConfirm ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )
              }
            >
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
              icon={
                pendingFill ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )
              }
            >
              {pendingFill ? "Updating…" : "Mark as filled"}
            </Button>
          </form>
        </div>
      </div>

      {/* ─── Bottom info strip ─── */}
      <div className="flex items-start gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-2.5 text-xs text-gray-500">
        <Info className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
        <p>
          HireLoop re-verifies every listing every{" "}
          <strong className="font-medium text-gray-700">14 days</strong>.
          Confirming now resets the timer. If no response is received, the
          listing is auto-archived after 48 hours.
        </p>
      </div>
    </div>
  );
}