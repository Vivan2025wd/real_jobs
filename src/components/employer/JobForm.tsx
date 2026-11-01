"use client";

import { useFormStatus } from "react-dom";
import {
  Briefcase,
  FileText,
  MapPin,
  Clock,
  Tag,
  Banknote,
  AlertCircle,
  Save,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DefaultValues = {
  title?: string;
  description?: string;
  location?: string;
  work_type?: "REMOTE" | "ONSITE" | "HYBRID";
  category?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  duration_days?: number;
};

// ---------------------------------------------------------------------------
// Static option lists
// ---------------------------------------------------------------------------
const WORK_TYPE_OPTIONS = [
  { value: "ONSITE", label: "On-site" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "REMOTE", label: "Remote" },
];

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

const DURATION_OPTIONS = [
  { value: 7, label: "7 days", hint: "Fast hire", price: 2499 },
  { value: 14, label: "14 days", hint: "Standard", price: 4499 },
  { value: 30, label: "30 days", hint: "Long-term", price: 8499 },
] as const;

// ---------------------------------------------------------------------------
// Submit button
// ---------------------------------------------------------------------------
function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full justify-center sm:w-auto"
      disabled={pending}
      icon={
        pending ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )
      }
    >
      {pending ? "Saving…" : children}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3.5 sm:space-y-5">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 sm:h-9 sm:w-9">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-gray-900 sm:text-base">
            {title}
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">{description}</p>
        </div>
      </div>
      <div className="space-y-3.5 sm:space-y-4">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styled textarea
// ---------------------------------------------------------------------------
function Textarea({
  id,
  name,
  required,
  minLength,
  rows = 8,
  defaultValue,
  placeholder,
  label,
  hint,
}: {
  id: string;
  name: string;
  required?: boolean;
  minLength?: number;
  rows?: number;
  defaultValue?: string;
  placeholder?: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-gray-700 sm:text-sm"
      >
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        required={required}
        minLength={minLength}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:px-3.5 sm:text-sm"
      />
      {hint && <p className="mt-1.5 text-[11px] text-gray-500 sm:text-xs">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------
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
  const selectedDuration = defaults.duration_days ?? 14;
  const selectedOption = DURATION_OPTIONS.find(
    (o) => o.value === selectedDuration
  );

  return (
    <form action={action} className="w-full space-y-6 sm:space-y-8">
      {/* ─── Error banner ─── */}
      {error && (
        <div className="flex w-full items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 sm:gap-3 sm:px-4 sm:py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 sm:h-8 sm:w-8">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-900 sm:text-base">
              Couldn&apos;t save the job
            </p>
            <p className="mt-0.5 text-xs leading-snug text-rose-800 sm:text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* ─── Section 1: The role ─── */}
      <Section
        icon={Briefcase}
        title="The role"
        description="What the job is called and what it involves."
      >
        <Input
          label="Job title"
          name="title"
          id="title"
          required
          minLength={3}
          maxLength={120}
          defaultValue={defaults.title}
          placeholder="Senior Frontend Engineer"
          icon={<Briefcase className="h-4 w-4" />}
          hint="A clear title gets 3× more applications than a vague one."
        />

        <Textarea
          id="description"
          name="description"
          required
          minLength={30}
          rows={6} // මොබයිල් එකේදී පොඩ්ඩක් අඩු කළා
          defaultValue={defaults.description}
          placeholder="Describe the role, responsibilities, and requirements…"
          label="Description"
          hint="Minimum 30 characters. Include responsibilities, requirements, and what makes the role interesting."
        />
      </Section>

      {/* ─── Divider ─── */}
      <div className="border-t border-gray-100" />

      {/* ─── Section 2: Location & work type ─── */}
      <Section
        icon={MapPin}
        title="Location & work type"
        description="Where the job is based and how it's worked."
      >
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <Input
            label="Location"
            name="location"
            id="location"
            required
            defaultValue={defaults.location}
            placeholder="Colombo, Sri Lanka"
            icon={<MapPin className="h-4 w-4" />}
          />

          <Select
            label="Work type"
            name="work_type"
            id="work_type"
            required
            options={WORK_TYPE_OPTIONS}
            defaultValue={defaults.work_type ?? "ONSITE"}
          />
        </div>

        <Select
          label="Category"
          name="category"
          id="category"
          options={CATEGORY_OPTIONS}
          placeholder="Uncategorised"
          defaultValue={defaults.category ?? ""}
        />
        <p className="-mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-500 sm:-mt-2 sm:text-xs">
          <Tag className="h-3 w-3 shrink-0 text-gray-400" />
          Powers the public category pages and search filters.
        </p>
      </Section>

      {/* ─── Divider ─── */}
      <div className="border-t border-gray-100" />

      {/* ─── Section 3: Compensation ─── */}
      <Section
        icon={Banknote}
        title="Compensation"
        description="Optional — leave blank if negotiable."
      >
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <Input
            label="Minimum salary (LKR)"
            name="salary_min"
            id="salary_min"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={defaults.salary_min ?? ""}
            placeholder="100000"
            icon={<Banknote className="h-4 w-4" />}
          />
          <Input
            label="Maximum salary (LKR)"
            name="salary_max"
            id="salary_max"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={defaults.salary_max ?? ""}
            placeholder="200000"
            icon={<Banknote className="h-4 w-4" />}
          />
        </div>
        <p className="-mt-1.5 text-[11px] leading-relaxed text-gray-500 sm:-mt-2 sm:text-xs">
          Listing a range builds trust — candidates skip roles with no salary
          info.
        </p>
      </Section>

      {/* ─── Divider ─── */}
      <div className="border-t border-gray-100" />

      {/* ─── Section 4: Posting duration + price ─── */}
      <Section
        icon={Clock}
        title="Posting duration"
        description="How long the listing stays live before auto-archiving."
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {DURATION_OPTIONS.map((opt) => {
            const isSelected = selectedDuration === opt.value;
            return (
              <label
                key={opt.value}
                className="group relative flex cursor-pointer flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2.5 transition has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:ring-1 has-[:checked]:ring-indigo-200 hover:border-gray-300 sm:p-3"
              >
                <input
                  type="radio"
                  name="duration_days"
                  value={opt.value}
                  defaultChecked={isSelected}
                  className="sr-only"
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-gray-500 sm:text-xs">{opt.hint}</p>
                  </div>
                  {opt.value === 14 && (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-semibold text-indigo-600 sm:text-sm">
                  LKR {opt.price.toLocaleString("en-LK")}
                </p>
              </label>
            );
          })}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-2.5 text-[11px] leading-relaxed text-indigo-900 sm:px-3 sm:py-2.5 sm:text-xs">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
          <p>
            You&apos;ll be charged{" "}
            <strong>
              LKR {(selectedOption?.price ?? 4499).toLocaleString("en-LK")}
            </strong>{" "}
            when you publish. Drafts are free — pay only when you&apos;re ready
            to go live.
          </p>
        </div>

        <p className="-mt-1.5 text-[11px] leading-relaxed text-gray-500 sm:-mt-2 sm:text-xs">
          Jobs auto-archive when the duration ends. You can mark a role as
          filled earlier from the job detail page.
        </p>
      </Section>

      {/* ─── Submit row ─── */}
      {/* මොබයිල් එකේදී බටන් එක උඩට එන්න flex-col-reverse දැම්මා */}
      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
        <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-gray-400 sm:justify-start sm:text-left sm:text-xs">
          <FileText className="h-3 w-3 shrink-0" />
          You can edit everything later — nothing is final until you publish.
        </p>
        <div className="w-full sm:w-auto">
          <Submit>{submitLabel}</Submit>
        </div>
      </div>
    </form>
  );
}