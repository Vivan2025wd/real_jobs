import type { ReactNode } from "react";

type Tone = "gray" | "blue" | "green" | "amber" | "red" | "violet";

const tones: Record<Tone, { bg: string; text: string; dot: string }> = {
  gray: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
  blue: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  amber: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  red: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
};

const statusToTone: Record<string, Tone> = {
  DRAFT: "gray",
  ACTIVE: "green",
  FILLED: "blue",
  EXPIRED: "amber",
  ARCHIVED: "gray",
  PENDING: "amber",
  REVIEWED: "blue",
  SHORTLISTED: "green",
  REJECTED: "red",
};

export function Badge({
  children,
  tone = "gray",
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
}) {
  const t = tones[tone];
  return (
    // මොබයිල් එකේදී px-2 py-0.5 text-[10px], ඩෙස්ක්ටොප් එකේදී sm:px-2.5 sm:py-1 sm:text-xs
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs ${t.bg} ${t.text}`}
    >
      {dot && (
        <span
          className={`inline-block h-1 w-1 shrink-0 rounded-full sm:h-1.5 sm:w-1.5 ${t.dot}`}
        />
      )}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusToTone[status] ?? "gray"} dot>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}