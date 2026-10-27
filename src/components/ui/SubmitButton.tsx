// src/components/ui/SubmitButton.tsx
"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  className?: string;
};

/**
 * SubmitButton — a `<Button type="submit">` that reads the parent form's
 * pending state via `useFormStatus`.
 *
 * Uses `<Button>` under the hood so it inherits the full design system:
 * indigo palette, focus-visible rings, active-scale micro-interaction,
 * disabled opacity, icon support. Nothing is styled locally.
 *
 * While pending:
 *   • The provided `icon` swaps to a spinning `RefreshCw`
 *   • The label swaps to `pendingText` (or "Working…")
 *   • The button is disabled
 */
export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  fullWidth = true,
  className = "",
}: Props) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      icon={
        pending ? <RefreshCw className="h-4 w-4 animate-spin" /> : icon
      }
      iconRight={pending ? undefined : iconRight}
      className={`${fullWidth ? "w-full" : ""} ${className}`.trim()}
    >
      {pending ? (pendingText ?? "Working…") : children}
    </Button>
  );
}