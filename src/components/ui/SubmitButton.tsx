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

  // මොබයිල් එකේදී බටන් එක හැමවෙලේම ලස්සනට මැදට එන්න justify-center දැම්මා
  const widthClass = fullWidth ? "w-full justify-center" : "";

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      icon={
        pending ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
        ) : (
          icon
        )
      }
      iconRight={pending ? undefined : iconRight}
      className={`${widthClass} ${className}`.trim()}
    >
      {pending ? (pendingText ?? "Working…") : children}
    </Button>
  );
}