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
    <div className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-3.5 shadow-card transition-all duration-200 hover:border-indigo-200 hover:shadow-card-hover sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4">
      
      {/* ─── Left Part: Avatar + Info (Mobile Row) ─── */}
      <div className="flex min-w-0 items-start gap-2.5 sm:flex-1 sm:items-center sm:gap-4">
        
        {/* Company avatar - මොබයිල් එකේදී පොඩි කළා */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-sm sm:h-12 sm:w-12 sm:rounded-xl sm:text-base">
          {companyName.charAt(0).toUpperCase()}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold tracking-tight text-gray-900 group-hover:text-indigo-700 sm:text-base">
            {jobTitle}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500 sm:gap-1.5 sm:text-sm">
            <Building2 className="h-3 w-3 shrink-0 text-gray-400 sm:h-3.5 sm:w-3.5" />
            {companyName}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 sm:text-xs">
            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            Applied {timeAgo(appliedAt)}
          </p>
        </div>
      </div>

      {/* ─── Right Part: Status Badge ─── */}
      {/* මොබයිල් එකේදී ටෙක්ස්ට් එකට හරියටම යටින් එන්න pl (padding-left) දුන්නා */}
      <div className="shrink-0 pl-[3.125rem] sm:pl-0">
        <StatusBadge status={status} />
      </div>
    </div>
  );
}