// src/components/ui/SubmitButton.tsx
"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary";
};

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
}: Props) {
  const { pending } = useFormStatus();

  const base =
    "w-full rounded-md px-4 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50";

  return (
    <button type="submit" disabled={pending} className={`${base} ${styles}`}>
      {pending ? pendingText ?? "Working…" : children}
    </button>
  );
}