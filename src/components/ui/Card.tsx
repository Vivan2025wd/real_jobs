import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      // w-full සහ overflow-hidden දැම්මා ලේආවුට් එක කැඩෙන එක නවත්තන්න
      className={`w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card ${
        hover ? "transition-all hover:border-gray-300 hover:shadow-card-hover" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    // මොබයිල් එකේදී padding px-3 py-3, ඩෙස්ක්ටොප් එකේදී sm:px-5 sm:py-4
    <div className="flex flex-col gap-2.5 border-b border-gray-100 px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 sm:h-9 sm:w-9">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-tight text-gray-900 sm:text-base">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-[11px] leading-snug text-gray-500 sm:text-xs">
              {description}
            </p>
          )}
        </div>
      </div>
      {/* Action එක මොබයිල් එකේදී සම්පූර්ණ පළල ගන්න සහ ඩෙස්ක්ටොප් එකේදී සාමාන්‍ය ප්‍රමාණයට එන්න */}
      {action && <div className="w-full sm:w-auto sm:shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    // මොබයිල් එකේදී padding px-3 py-3.5, ඩෙස්ක්ටොප් එකේදී sm:px-5 sm:py-5
    <div className={`px-3 py-3.5 sm:px-5 sm:py-5 ${className}`}>{children}</div>
  );
}