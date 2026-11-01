"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Filter,
  RotateCcw,
  Search,
  MapPin,
  Tag,
  Clock,
  Banknote,
  ArrowUpDown,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const CATEGORY_OPTIONS = [
  { value: "ENGINEERING", label: "Engineering" },
  { value: "DESIGN", label: "Design" },
  { value: "MARKETING", label: "Marketing" },
  { value: "SALES", label: "Sales" },
  { value: "CUSTOMER_SUPPORT", label: "Customer Support" },
  { value: "FINANCE", label: "Finance" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "HR", label: "HR" },
  { value: "OTHER", label: "Other" },
];

const WORK_TYPE_OPTIONS = [
  { value: "REMOTE", label: "Remote" },
  { value: "ONSITE", label: "On-site" },
  { value: "HYBRID", label: "Hybrid" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "salary", label: "Highest salary" },
];

const FILTER_KEYS = [
  "q",
  "location",
  "category",
  "work_type",
  "salary_min",
] as const;

type FilterFieldsProps = {
  params: ReturnType<typeof useSearchParams>;
  setParam: (key: string, value: string) => void;
  idPrefix: string;
};

function FilterFields({ params, setParam, idPrefix }: FilterFieldsProps) {
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  return (
    <>
      <Input
        id={fieldId("q")}
        name="q"
        type="search"
        label="Keyword"
        placeholder="e.g. React, backend"
        defaultValue={params.get("q") ?? ""}
        onBlur={(e) => setParam("q", e.target.value.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setParam("q", (e.target as HTMLInputElement).value.trim());
          }
        }}
        icon={<Search className="h-4 w-4" />}
      />

      <Input
        id={fieldId("location")}
        name="location"
        type="text"
        label="Location"
        placeholder="e.g. Colombo"
        defaultValue={params.get("location") ?? ""}
        onBlur={(e) => setParam("location", e.target.value.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setParam("location", (e.target as HTMLInputElement).value.trim());
          }
        }}
        icon={<MapPin className="h-4 w-4" />}
      />

      <Select
        id={fieldId("category")}
        name="category"
        label="Category"
        placeholder="All categories"
        options={CATEGORY_OPTIONS}
        value={params.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
      />

      <Select
        id={fieldId("work")}
        name="work_type"
        label="Work type"
        placeholder="Any"
        options={WORK_TYPE_OPTIONS}
        value={params.get("work_type") ?? ""}
        onChange={(e) => setParam("work_type", e.target.value)}
      />

      <Input
        id={fieldId("salary")}
        name="salary_min"
        type="number"
        min={0}
        step={10000}
        label="Minimum salary (LKR)"
        placeholder="e.g. 100000"
        defaultValue={params.get("salary_min") ?? ""}
        onBlur={(e) => setParam("salary_min", e.target.value)}
        icon={<Banknote className="h-4 w-4" />}
      />

      <Select
        id={fieldId("sort")}
        name="sort"
        label="Sort by"
        options={SORT_OPTIONS}
        value={params.get("sort") || "newest"}
        onChange={(e) =>
          setParam("sort", e.target.value === "newest" ? "" : e.target.value)
        }
      />

      <div className="hidden" aria-hidden>
        <Tag className="h-4 w-4" />
        <Clock className="h-4 w-4" />
        <ArrowUpDown className="h-4 w-4" />
      </div>
    </>
  );
}

export function JobFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    startTransition(() => {
      router.push(`/jobs${next.size ? `?${next.toString()}` : ""}`);
    });
  }

  function reset() {
    startTransition(() => router.push("/jobs"));
  }

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const activeFilterCount = FILTER_KEYS.filter((k) => params.get(k)).length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <>
      {/* ─── Mobile trigger ─── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="job-filters-drawer"
        // මොබයිල් එකේදී උස ප්‍රමාණවත් වෙන්න සහ පැඩින් අඩු කළා
        className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium shadow-sm transition hover:bg-gray-50 lg:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              {activeFilterCount}
            </span>
          )}
        </span>
        <span className="text-[11px] text-gray-400">Tap to open</span>
      </button>

      {/* ─── Desktop sidebar ─── */}
      <aside
        className={`hidden space-y-4 transition-opacity lg:block lg:space-y-5 ${
          pending ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Filter className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-gray-900">
              Filters
            </h2>
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                {activeFilterCount}
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        <FilterFields params={params} setParam={setParam} idPrefix="f" />
      </aside>

      {/* ─── Mobile drawer ─── */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* 
            Drawer පැඩින් එක px-3.5 කළා, එතකොට පොඩි ෆෝන්ස් වලටත් හොඳට ෆිට් වෙනවා.
            Safe area inset එකත් හරියටම තියෙනවා.
          */}
          <div
            id="job-filters-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Job filters"
            className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white px-3.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-xl sm:px-4 sm:pt-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 sm:pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold sm:text-base">Filters</h2>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setOpen(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 sm:px-2.5 sm:text-xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form fields spacing එක මොබයිල් එකේදී ටිකක් අඩු කළා */}
            <div
              className={`space-y-3.5 py-3 transition-opacity sm:space-y-4 sm:py-4 ${
                pending ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <FilterFields params={params} setParam={setParam} idPrefix="m" />
            </div>

            <div className="sticky bottom-0 border-t border-gray-100 bg-white pb-1 pt-2.5 sm:pt-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                // බටන් එක ඇඟිල්ලෙන් ඔබන්න ලේසි වෙන්න min-h-[48px] දැම්මා
                className="flex min-h-[48px] w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] sm:py-3"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}