import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  Briefcase,
  Sparkles,
  AlertCircle,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/employer/JobForm";
import { jobSchema } from "@/lib/validators/job";
import { priceForDuration } from "@/lib/utils/constants";

async function createJob(formData: FormData) {
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
    redirect(`/dashboard/employer/jobs/new?error=${encodeURIComponent(msg)}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("employer_id", user.id)
    .maybeSingle();

  const companyId = (company as { id: string } | null)?.id;
  if (!companyId) redirect("/dashboard/employer/company");

  // ─── Lock the price at creation time ───
  const priceLkr = priceForDuration(parsed.data.duration_days);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + parsed.data.duration_days * 86_400_000
  );

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      company_id: companyId,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      work_type: parsed.data.work_type,
      category: parsed.data.category ?? null,
      salary_min: parsed.data.salary_min ?? null,
      salary_max: parsed.data.salary_max ?? null,
      duration_days: parsed.data.duration_days,
      price_lkr: priceLkr,
      expires_at: expiresAt.toISOString(),
      status: "DRAFT",
    } as never)
    .select("id")
    .single();

  if (error) {
    redirect(
      `/dashboard/employer/jobs/new?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/dashboard/employer/jobs");
  redirect(`/dashboard/employer/jobs/${(job as { id: string }).id}`);
}

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ─── Back link ─── */}
      <Link
        href="/dashboard/employer/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      {/* ─── Header ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-card sm:p-6">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-100/40 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl text-balance">
              Post a new job
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Save as a draft first — then pay to publish. Plans start at{" "}
              <strong className="text-gray-700">LKR 2,499</strong> for 7 days.
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
              Couldn&apos;t save draft
            </p>
            <p className="mt-0.5 text-sm text-rose-800">{searchParams.error}</p>
          </div>
        </div>
      )}

      {/* ─── Info callout ─── */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
        <p className="text-sm text-indigo-900">
          Drafts are private — only you can see them. You&apos;ll be prompted to
          pay before the listing goes live on the public board.
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
            action={createJob}
            submitLabel="Save as draft"
            error={undefined}
          />
        </div>
      </div>

      {/* ─── Footer hint ─── */}
      <p className="text-center text-xs text-gray-400">
        Need to change something later? You can edit drafts anytime before
        publishing.
      </p>
    </div>
  );
}