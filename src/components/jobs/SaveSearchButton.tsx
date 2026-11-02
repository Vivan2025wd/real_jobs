"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BookmarkPlus } from "lucide-react";
import { saveSearch, type AlertFrequency } from "@/app/actions/saved-searches";
import type { JobSearchFilters } from "@/lib/jobs/search";

export function SaveSearchButton({
  filters,
  authenticated,
  returnTo,
}: {
  filters: JobSearchFilters;
  authenticated: boolean;
  returnTo: string;
}) {
  const [frequency, setFrequency] = useState<AlertFrequency>("DAILY");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!authenticated) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(returnTo)}`}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 sm:px-3 sm:text-sm"
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        Save this search
      </Link>
    );
  }

  function save() {
    setMessage("");
    startTransition(async () => {
      const result = await saveSearch(filters, frequency);
      setMessage(
        result.error ??
          (frequency === "NONE"
            ? "Search saved. Alerts are off."
            : "Search saved. Your alert is on.")
      );
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <label className="sr-only" htmlFor="save-search-frequency">
        Alert frequency
      </label>
      <select
        id="save-search-frequency"
        value={frequency}
        onChange={(event) =>
          setFrequency(event.target.value as AlertFrequency)
        }
        className="h-9 max-w-28 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        <option value="DAILY">Daily</option>
        <option value="WEEKLY">Weekly</option>
        <option value="NONE">No alerts</option>
      </select>
      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60 sm:px-3 sm:text-sm"
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        {isPending ? "Saving…" : "Save search"}
      </button>
      {message && (
        <span
          role="status"
          className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
            message.startsWith("Search saved")
              ? "bg-emerald-700"
              : "bg-rose-700"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
