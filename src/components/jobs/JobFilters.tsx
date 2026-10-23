"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

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

  const anyActive = ["q", "location", "work_type", "category", "salary_min", "sort"].some(
    (k) => params.get(k)
  );

  return (
    <aside className={`space-y-5 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        {anyActive && (
          <button
            type="button"
            onClick={reset}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      <div>
        <label htmlFor="f-q" className="block text-xs font-medium text-gray-700">
          Keyword
        </label>
        <input
          id="f-q"
          type="search"
          defaultValue={params.get("q") ?? ""}
          onBlur={(e) => setParam("q", e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setParam("q", (e.target as HTMLInputElement).value.trim());
            }
          }}
          placeholder="e.g. React, backend"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="f-location" className="block text-xs font-medium text-gray-700">
          Location
        </label>
        <input
          id="f-location"
          type="text"
          defaultValue={params.get("location") ?? ""}
          onBlur={(e) => setParam("location", e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setParam("location", (e.target as HTMLInputElement).value.trim());
            }
          }}
          placeholder="e.g. Colombo"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="f-category" className="block text-xs font-medium text-gray-700">
          Category
        </label>
        <select
          id="f-category"
          defaultValue={params.get("category") ?? ""}
          onChange={(e) => setParam("category", e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          <option value="ENGINEERING">Engineering</option>
          <option value="DESIGN">Design</option>
          <option value="MARKETING">Marketing</option>
          <option value="SALES">Sales</option>
          <option value="CUSTOMER_SUPPORT">Customer Support</option>
          <option value="FINANCE">Finance</option>
          <option value="OPERATIONS">Operations</option>
          <option value="HR">HR</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="f-work" className="block text-xs font-medium text-gray-700">
          Work type
        </label>
        <select
          id="f-work"
          defaultValue={params.get("work_type") ?? ""}
          onChange={(e) => setParam("work_type", e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Any</option>
          <option value="REMOTE">Remote</option>
          <option value="ONSITE">On-site</option>
          <option value="HYBRID">Hybrid</option>
        </select>
      </div>

      <div>
        <label htmlFor="f-salary" className="block text-xs font-medium text-gray-700">
          Minimum salary (LKR)
        </label>
        <input
          id="f-salary"
          type="number"
          min={0}
          step={10000}
          defaultValue={params.get("salary_min") ?? ""}
          onBlur={(e) => setParam("salary_min", e.target.value)}
          placeholder="e.g. 100000"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="f-sort" className="block text-xs font-medium text-gray-700">
          Sort by
        </label>
        <select
          id="f-sort"
          defaultValue={params.get("sort") ?? "newest"}
          onChange={(e) => setParam("sort", e.target.value === "newest" ? "" : e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="newest">Newest first</option>
          <option value="salary">Highest salary</option>
        </select>
      </div>
    </aside>
  );
}