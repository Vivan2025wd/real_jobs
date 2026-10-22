import type { ReactNode } from "react";

type Tone = "gray" | "blue" | "green" | "amber" | "red";

const tones: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
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

export function Badge({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone ?? "gray"]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusToTone[status] ?? "gray"}>{status}</Badge>;
}