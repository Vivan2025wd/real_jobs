"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";

type Props = {
  totalApplications90d: number;
  respondedApplications90d: number;
  averageResponseHours: number | null;
  variant?: "compact" | "full";
};

function responseTime(hours: number): string {
  if (hours < 1) return "Typically replies in under an hour";
  if (hours < 24) {
    const roundedHours = Math.max(1, Math.round(hours));
    return `Typically replies in ${roundedHours} hour${roundedHours === 1 ? "" : "s"}`;
  }
  const days = Math.max(1, Math.round(hours / 24));
  return `Typically replies in ${days} day${days === 1 ? "" : "s"}`;
}

export function ResponseRateBadge({
  totalApplications90d,
  respondedApplications90d,
  averageResponseHours,
  variant = "full",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const explanationId = useId();
  const compact = variant === "compact";
  const qualified = totalApplications90d >= 5;
  const percentage = qualified
    ? Math.round((respondedApplications90d / totalApplications90d) * 100)
    : null;
  const badge = !qualified
    ? {
        label: "New employer",
        classes: "bg-gray-100 text-gray-600 ring-gray-200",
      }
    : percentage !== null && percentage >= 80
      ? {
          label: "Highly responsive",
          classes: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        }
      : percentage !== null && percentage >= 50
        ? {
            label: "Usually responds",
            classes: "bg-amber-50 text-amber-800 ring-amber-200",
          }
        : {
            label: "Low response rate",
            classes: "bg-gray-100 text-gray-700 ring-gray-200",
          };

  return (
    <span className="pointer-events-auto relative inline-flex max-w-full items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${
          compact ? "text-[10px]" : "text-xs"
        } ${badge.classes}`}
      >
        {badge.label}
        {percentage !== null && (
          <span aria-label={`${percentage}% response rate`}>· {percentage}%</span>
        )}
      </span>
      {averageResponseHours !== null && (
        <span className={compact ? "text-[10px] text-gray-500" : "text-xs text-gray-500"}>
          {responseTime(averageResponseHours)}
        </span>
      )}
      <button
        type="button"
        aria-label="About this response rate"
        aria-expanded={isOpen}
        aria-controls={explanationId}
        aria-describedby={isOpen ? explanationId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:h-7 sm:w-7"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {isOpen && (
        <span
          id={explanationId}
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-2.5 text-left text-xs font-normal leading-relaxed text-gray-700 shadow-lg"
        >
          Based on applications from the last 90 days.
        </span>
      )}
    </span>
  );
}
