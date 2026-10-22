"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

type DefaultValues = {
  title?: string;
  description?: string;
  location?: string;
  work_type?: "REMOTE" | "ONSITE" | "HYBRID";
  salary_min?: number | null;
  salary_max?: number | null;
};

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : children}
    </Button>
  );
}

export function JobForm({
  action,
  defaults = {},
  submitLabel,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: DefaultValues;
  submitLabel: string;
  error?: string;
}) {
  return (
    <form action={action} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Job title</label>
        <input
          id="title" name="title" required minLength={3} maxLength={120}
          defaultValue={defaults.title}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Senior Frontend Engineer"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="description" name="description" required minLength={30} rows={8}
          defaultValue={defaults.description}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Describe the role, responsibilities, and requirements…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
          <input
            id="location" name="location" required
            defaultValue={defaults.location}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Colombo, Sri Lanka"
          />
        </div>
        <div>
          <label htmlFor="work_type" className="block text-sm font-medium text-gray-700">Work type</label>
          <select
            id="work_type" name="work_type" required
            defaultValue={defaults.work_type ?? "ONSITE"}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ONSITE">On-site</option>
            <option value="HYBRID">Hybrid</option>
            <option value="REMOTE">Remote</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="salary_min" className="block text-sm font-medium text-gray-700">Salary min (LKR)</label>
          <input
            id="salary_min" name="salary_min" type="number" min={0}
            defaultValue={defaults.salary_min ?? ""}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="100000"
          />
        </div>
        <div>
          <label htmlFor="salary_max" className="block text-sm font-medium text-gray-700">Salary max (LKR)</label>
          <input
            id="salary_max" name="salary_max" type="number" min={0}
            defaultValue={defaults.salary_max ?? ""}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="200000"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Submit>{submitLabel}</Submit>
      </div>
    </form>
  );
}