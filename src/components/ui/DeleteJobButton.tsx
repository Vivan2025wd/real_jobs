"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Props = {
  /** The server action that accepts a FormData with key "jobId". */
  deleteAction: (formData: FormData) => Promise<void>;
  jobId: string;
  /** Label shown next to the button — usually the job title */
  jobTitle?: string;
  /** Visual variant: "button" (default) renders a full <Button>, "icon" renders icon-only */
  variant?: "button" | "icon";
};

/**
 * Client-side delete button that shows a confirmation dialog before
 * calling the server action.  Works for both employer and admin job pages.
 */
export function DeleteJobButton({
  deleteAction,
  jobId,
  jobTitle,
  variant = "button",
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setDialogOpen(false);
    const fd = new FormData();
    fd.set("jobId", jobId);
    startTransition(async () => {
      try {
        await deleteAction(fd);
        toast.success("Job deleted");
      } catch {
        toast.error("Failed to delete the job. Please try again.");
      }
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => setDialogOpen(true)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-50 md:min-h-0 md:min-w-0 md:h-8 md:w-8"
          title="Delete Job"
          aria-label="Delete job"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => setDialogOpen(true)}
          icon={<Trash2 className="h-3.5 w-3.5" />}
          className="w-full justify-center text-rose-600 hover:bg-rose-50 sm:w-auto"
        >
          Delete
        </Button>
      )}

      <ConfirmDialog
        open={dialogOpen}
        title="Delete job listing?"
        description={
          jobTitle
            ? `"${jobTitle}" will be permanently removed and cannot be recovered.`
            : "This job listing will be permanently removed and cannot be recovered."
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setDialogOpen(false)}
      />
    </>
  );
}
