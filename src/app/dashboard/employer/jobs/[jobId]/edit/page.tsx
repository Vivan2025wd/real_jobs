import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  Edit3,
  AlertCircle,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/employer/JobForm";
import { jobSchema } from "@/lib/validators/job";
import { priceForDuration } from "@/lib/utils/constants";

async function updateJob(jobId: string, formData: FormData) {
  "use server";

  const parsed = jobSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    work_type: formData.get("work_type"),
    category: formData.get("category") || null,
    salary_min: formData.get("salary_min") || null,
    salary_max: formData.get("salary_max") || null,
    duration_days: formData.get("duration_days") || 14,
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    redirect(
      `/dashboard/employer/jobs/${jobId}/edit?error=${encodeURIComponent(msg)}`
    );
  }

  const supabase = await createClient();

  // ─── Read the job to get its original created_at (for expires_at) ───
  type ExistingJob = {
    id: string;
    created_at: string;
    status: "DRAFT" | "ACTIVE" | "FILLED" | "EXPIRED" | "ARCHIVED";
  };

  const { data: existing } = await supabase
    .from("jobs")
    .select("id, created_at, status")
    .eq("id", jobId)
    .maybeSingle();

  const existingJob = existing as unknown as ExistingJob | null;
  if (!existingJob) notFound();

  // ─── Recompute price + expiry from the new duration ───
  const newPriceLkr = priceForDuration(parsed.data.duration_days);
  const newExpiresAt = new Date(
    new Date(existingJob.created_at).getTime() +
      parsed.data.duration_days * 86_400_000
  );

  const { error } = await supabase
    .from("jobs")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      work_type: parsed.data.work_type,
      category: parsed.data.category ?? null,
      salary_min: parsed.data.salary_min ?? null,
      salary_max: parsed.data.salary_max ?? null,
      duration_days: parsed.data.duration_days,
      price_lkr: newPriceLkr,
      expires_at: newExpiresAt.toISOString(),
    } as never)
    .eq("id", jobId);

  if (error) {
    redirect(
      `/dashboard/employer/jobs/${jobId}/edit?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath(`/dashboard/employer/jobs/${jobId}`);
  revalidatePath("/dashboard/employer/jobs");
  redirect(`/dashboard/employer/jobs/${jobId}`);
}

// ---------------------------------------------------------------------------
// Row type — matches the select string below.
// ---------------------------------------------------------------------------
type JobRow = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string;
  work_type: "REMOTE" | "ONSITE" | "HYBRID";
  category: string | null;
  salary_min: number | null;
  salary_max: number | null;
  status: "DRAFT" | "ACTIVE" | "FILLED" | "EXPIRED" | "ARCHIVED";
  created_at: string;
  duration_days: number;
  price_lkr: number;
};

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: { jobId: string };
  searchParams: { error?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data } = await supabase
    .from("jobs")
    .select("*, companies!inner(employer_id)")
    .eq("id", params.jobId)
    .maybeSingle();

  const job = data as unknown as
    | (JobRow & { companies: { employer_id: string } })
    | null;

  if (!job || job.companies.employer_id !== user.id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ─── Back link ─── */}
      <Link
        href={`/dashboard/employer/jobs/${job.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to job
      </Link>

      {/* ─── Header ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-card sm:p-6">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-100/40 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <Edit3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl text-balance">
              Edit job
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Update the listing — changes appear immediately.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Error banner ─── */}
      {searchParams.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-rose-900">
              Couldn&apos;t save changes
            </p>
            <p className="mt-0.5 text-sm text-rose-800">
              {searchParams.error}
            </p>
          </div>
        </div>
      )}

      {/* ─── Status info bar ─── */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
        <p className="text-sm text-indigo-900">
          {job.status === "DRAFT" ? (
            <>
              This job is still a <strong>draft</strong>. Changes save
              immediately, but the listing won&apos;t appear publicly until you
              pay and publish. Changing the duration recomputes the price —
              LKR {job.price_lkr.toLocaleString("en-LK")} for{" "}
              {job.duration_days} days.
            </>
          ) : (
            <>
              This job is <strong>live</strong>. Changes appear on the public
              board within a few minutes. Extending the duration will not
              refund or charge extra — the original price stays locked.
            </>
          )}
        </p>
      </div>

      {/* ─── Form card ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold tracking-tight text-gray-900">
              Job details
            </h2>
            <p className="text-xs text-gray-500">
              All fields except salary are required.
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <JobForm
            action={updateJob.bind(null, job.id)}
            submitLabel="Save changes"
            defaults={{
              title: job.title,
              description: job.description,
              location: job.location,
              work_type: job.work_type,
              category: job.category,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              duration_days: job.duration_days,
            }}
          />
        </div>
      </div>

      {/* ─── Footer hint ─── */}
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
        <Clock className="h-3 w-3" />
        Need to close the role? Mark it as filled from the job detail page.
      </p>
    </div>
  );
}