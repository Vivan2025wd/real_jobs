"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Filter,
  RotateCcw,
  Search,
  MapPin,
  Tag,
  Clock,
  Banknote,
  ArrowUpDown,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

// ---------------------------------------------------------------------------
// Option lists — flat value+label, no empty-value entries.
// The `placeholder` prop on <Select> handles the empty choice.
// ---------------------------------------------------------------------------
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

// Any of these being present in the URL counts as an "active filter".
const FILTER_KEYS = [
  "q",
  "location",
  "category",
  "work_type",
  "salary_min",
  "sort",
] as const;

export function JobFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // reset pagination on any filter change
    startTransition(() => {
      router.push(`/jobs${next.size ? `?${next.toString()}` : ""}`);
    });
  }

  function reset() {
    startTransition(() => router.push("/jobs"));
  }

  const activeFilterCount = FILTER_KEYS.filter((k) => params.get(k)).length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <aside
      className={`space-y-5 transition-opacity ${pending ? "pointer-events-none opacity-60" : ""}`}
    >
      {/* ─── Header ─── */}
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
            className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 sm:min-h-0 sm:px-2 sm:py-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* ─── Search ─── */}
      <Input
        id="f-q"
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

      {/* ─── Location ─── */}
      <Input
        id="f-location"
        name="location"
        type="text"
        label="Location"
        placeholder="e.g. Colombo"
        defaultValue={params.get("location") ?? ""}
        onBlur={(e) => setParam("location", e.target.value.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setParam(
              "location",
              (e.target as HTMLInputElement).value.trim()
            );
          }
        }}
        icon={<MapPin className="h-4 w-4" />}
      />

      {/* ─── Category ─── */}
      <Select
        id="f-category"
        name="category"
        label="Category"
        placeholder="All categories"
        options={CATEGORY_OPTIONS}
        value={params.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
      />

      {/* ─── Work type ─── */}
      <Select
        id="f-work"
        name="work_type"
        label="Work type"
        placeholder="Any"
        options={WORK_TYPE_OPTIONS}
        value={params.get("work_type") ?? ""}
        onChange={(e) => setParam("work_type", e.target.value)}
      />

      {/* ─── Minimum salary ─── */}
      <Input
        id="f-salary"
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

      {/* ─── Sort ─── */}
      <Select
        id="f-sort"
        name="sort"
        label="Sort by"
        options={SORT_OPTIONS}
        value={params.get("sort") || "newest"}
        onChange={(e) =>
          setParam("sort", e.target.value === "newest" ? "" : e.target.value)
        }
      />

      {/* ─── Filter icon hints (decorative) ─── */}
      <div className="hidden" aria-hidden>
        <Tag className="h-4 w-4" />
        <Clock className="h-4 w-4" />
        <ArrowUpDown className="h-4 w-4" />
      </div>
    </aside>
  );
}