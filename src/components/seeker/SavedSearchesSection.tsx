"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, BookmarkCheck, Trash2 } from "lucide-react";
import {
  deleteSearch,
  toggleAlert,
  type AlertFrequency,
} from "@/app/actions/saved-searches";
import { summarizeJobSearch, type JobSearchFilters } from "@/lib/jobs/search";

type SavedSearchItem = {
  id: string;
  filters: JobSearchFilters;
  alert_frequency: AlertFrequency;
};

export function SavedSearchesSection({
  initialSearches,
}: {
  initialSearches: SavedSearchItem[];
}) {
  const [searches, setSearches] = useState(initialSearches);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function changeFrequency(id: string, frequency: AlertFrequency) {
    setPendingId(id);
    setMessage("");
    const result = await toggleAlert(id, frequency);
    if (result.error) {
      setMessage(result.error);
    } else {
      setSearches((current) =>
        current.map((search) =>
          search.id === id ? { ...search, alert_frequency: frequency } : search
        )
      );
      setMessage("Alert preferences updated.");
    }
    setPendingId(null);
  }

  async function removeSearch(id: string) {
    setPendingId(id);
    setMessage("");
    const result = await deleteSearch(id);
    if (result.error) {
      setMessage(result.error);
    } else {
      setSearches((current) => current.filter((search) => search.id !== id));
      setMessage("Saved search deleted.");
    }
    setPendingId(null);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card sm:rounded-2xl">
      <div className="flex items-center gap-3 border-b border-gray-100 px-3.5 py-3.5 sm:px-5 sm:py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <BookmarkCheck className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
            Saved Searches &amp; Alerts
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Manage searches and new-job email alerts.
          </p>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="border-b border-gray-100 bg-indigo-50 px-3.5 py-2 text-xs text-indigo-800 sm:px-5"
        >
          {message}
        </p>
      )}

      {searches.length === 0 ? (
        <div className="px-4 py-8 text-center sm:px-6">
          <p className="text-sm font-medium text-gray-800">
            No saved searches yet
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Save a filtered job search to get alerts when matching roles go
            live.
          </p>
          <Link
            href="/jobs"
            className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Browse jobs
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {searches.map((search) => (
            <li
              key={search.id}
              className="flex flex-col gap-3 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-medium leading-5 text-gray-900">
                  {summarizeJobSearch(search.filters)}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                  <Bell className="h-3 w-3" />
                  {search.alert_frequency === "NONE"
                    ? "Alerts off"
                    : `${search.alert_frequency === "DAILY" ? "Daily" : "Weekly"} alerts`}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                <label className="sr-only" htmlFor={`alert-frequency-${search.id}`}>
                  Alert frequency
                </label>
                <select
                  id={`alert-frequency-${search.id}`}
                  value={search.alert_frequency}
                  disabled={pendingId === search.id}
                  onChange={(event) =>
                    changeFrequency(
                      search.id,
                      event.target.value as AlertFrequency
                    )
                  }
                  className="h-10 min-w-32 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 sm:flex-none"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="NONE">No alerts</option>
                </select>
                <button
                  type="button"
                  aria-label="Delete saved search"
                  disabled={pendingId === search.id}
                  onClick={() => removeSearch(search.id)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
