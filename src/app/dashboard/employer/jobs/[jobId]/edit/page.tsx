import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  AlertCircle,
  Info,
  Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/employer/JobForm";
import { jobSchema } from "@/lib/validators/job";
import { StatusBadge } from "@/components/ui/Badge";

// ---------- Explicit row types ----------
type JobEditRow = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string;
  work_type: "REMOTE" | "ONSITE" | "HYBRID";
  category:
    | "ENGINEERING"
    | "DESIGN"
    | "MARKETING"
    | "SALES"
    | "CUSTOMER_SUPPORT"
    | "FINANCE"
    | "OPERATIONS"
    | "HR"
    | "OTHER"
    | null;
  salary_min: number | null;
  salary_max: number | null;
  status: string;
  created_at: string;
  last_verified_at: string | null;
};

type CompanyRow = { employer_id: string };

// ---------- Server Action (unchanged logic) ----------
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
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    redirect(
      `/dashboard/employer/jobs/${jobId}/edit?error=${encodeURIComponent(msg)}`
    );
  }

  const supabase = await createClient();

  const { error } = await (supabase.from("jobs") as any)
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      work_type: parsed.data.work_type,
      category: parsed.data.category ?? null,
      salary_min: parsed.data.salary_min ?? null,
      salary_max: parsed.data.salary_max ?? null,
    })
    .eq("id", jobId);

  if (error) {
    redirect(
      `/dashboard/employer/jobs/${jobId}/edit?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath(`/dashboard/employer/jobs/${jobId}`);
  revalidatePath("/dashboard/employer/jobs");
  redirect(`/dashboard/employer/jobs/${jobId}`);
}

// ---------- Page ----------
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

  if (!user) redirect("/login");

  const { data: jobRaw } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", params.jobId)
    .maybeSingle();

  const job = jobRaw as JobEditRow | null;
  if (!job) notFound();

  const { data: companyRaw } = await supabase
    .from("companies")
    .select("employer_id")
    .eq("id", job.company_id)
    .maybeSingle();

  const company = companyRaw as CompanyRow | null;
  if (!company || company.employer_id !== user.id) notFound();

  const isLive = job.status === "ACTIVE";

  return (
    <div className="mx-auto max-w-3xl">
      {/* ─── Breadcrumb + Back ─── */}
      <Link
        href={`/dashboard/employer/jobs/${job.id}`}
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
        Back to job
      </Link>

      {/* ─── Header ─── */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <Pencil className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Edit job
              </h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Update the listing details below. Changes are visible to job
              seekers immediately.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Live state notice ─── */}
      {isLive && (
        <div className="mt-6 flex gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <Info className="h-5 w-5 shrink-0 text-indigo-600" />
          <div className="text-sm">
            <p className="font-medium text-indigo-900">
              This job is currently live
            </p>
            <p className="mt-0.5 text-indigo-700">
              Any changes you save will be visible on the public job board
              within a few minutes. Consider whether candidates already applying
              need to know about major edits.
            </p>
          </div>
        </div>
      )}

      {/* ─── Error banner ─── */}
      {searchParams.error && (
        <div className="mt-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="text-sm">
            <p className="font-medium text-rose-900">Couldn&apos;t save changes</p>
            <p className="mt-0.5 text-rose-700">{searchParams.error}</p>
          </div>
        </div>
      )}

      {/* ─── Form card ─── */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
        {/* Card header */}
        <div className="border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50 px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Save className="h-4 w-4 text-indigo-600" />
            Job details
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            All fields marked with an asterisk are required.
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-6">
          <JobForm
            action={updateJob.bind(null, job.id)}
            submitLabel="Save changes"
            error={searchParams.error}
            defaults={{
              title: job.title,
              description: job.description,
              location: job.location,
              work_type: job.work_type,
              category: job.category,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
            }}
          />
        </div>
      </div>

      {/* ─── Footer hint ─── */}
      <p className="mt-6 text-center text-xs text-gray-400">
        Press{" "}
        <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
          Esc
        </kbd>{" "}
        or use the back link to discard changes without saving.
      </p>
    </div>
  );
}