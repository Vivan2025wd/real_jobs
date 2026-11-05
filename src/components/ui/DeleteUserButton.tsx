"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Props = {
  deleteAction: (formData: FormData) => Promise<void>;
  userId: string;
  userEmail?: string;
};

/**
 * Client-side delete button for the admin users page.
 * Shows a confirmation dialog before calling the server action.
 */
export function DeleteUserButton({ deleteAction, userId, userEmail }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setDialogOpen(false);
    const fd = new FormData();
    fd.set("userId", userId);
    startTransition(async () => {
      try {
        await deleteAction(fd);
        toast.success("User deleted");
      } catch {
        toast.error("Failed to delete the user. Please try again.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setDialogOpen(true)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-50 md:min-h-0 md:min-w-0 md:h-8 md:w-8"
        title="Delete User"
        aria-label="Delete user"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmDialog
        open={dialogOpen}
        title="Delete user account?"
        description={
          userEmail
            ? `"${userEmail}" and all associated data (jobs, applications) will be permanently removed.`
            : "This user and all associated data will be permanently removed."
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setDialogOpen(false)}
      />
    </>
  );
}
