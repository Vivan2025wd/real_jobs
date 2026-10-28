// src/components/applications/ApplicationCard.tsx
import { Clock, Building2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils/format";

export function ApplicationCard({
  jobTitle,
  companyName,
  status,
  appliedAt,
}: {
  jobTitle: string;
  companyName: string;
  status: string;
  appliedAt: string;
}) {
  return (
    <div className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-card transition-all duration-200 hover:border-indigo-200 hover:shadow-card-hover sm:flex-row sm:items-center sm:gap-4">
      {/* Company avatar */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-semibold text-white shadow-sm">
        {companyName.charAt(0).toUpperCase()}
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold tracking-tight text-gray-900 group-hover:text-indigo-700">
          {jobTitle}
        </h3>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-gray-500">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          {companyName}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          Applied {timeAgo(appliedAt)}
        </p>
      </div>

      {/* Status */}
      <div className="shrink-0 sm:shrink-0">
        <StatusBadge status={status} />
      </div>
    </div>
  );
}