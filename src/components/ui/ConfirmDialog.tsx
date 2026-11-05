"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Called when the user clicks "Yes, Delete" (or the custom confirm label). */
  onConfirm: () => void;
  /** Called when the user clicks "Cancel" or presses Escape or clicks the backdrop. */
  onCancel: () => void;
};

/**
 * Accessible confirmation dialog built on the native <dialog> element.
 * Uses Tailwind for styling and is fully mobile-first.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Yes, Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync the native <dialog> open state with the React prop.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Close on native "cancel" event (Escape key).
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleCancel = (e: Event) => {
      e.preventDefault(); // prevent the browser from closing on its own
      onCancel();
    };
    el.addEventListener("cancel", handleCancel);
    return () => el.removeEventListener("cancel", handleCancel);
  }, [onCancel]);

  // Close when clicking the backdrop (outside the inner panel).
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { clientX: x, clientY: y } = e;
    const outside =
      x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
    if (outside) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-gray-200 bg-white p-0 shadow-xl backdrop:bg-gray-950/50 sm:max-w-md"
    >
      <div className="p-5 sm:p-6">
        {/* Icon + heading */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 sm:h-11 sm:w-11">
            <AlertTriangle className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="w-full justify-center sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            className="w-full justify-center sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
