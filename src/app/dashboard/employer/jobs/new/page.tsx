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
import { createAdminClient } from "@/lib/supabase/admin";
import { JobForm } from "@/components/employer/JobForm";
import { jobSchema } from "@/lib/validators/job";
import {
  FREE_JOBS_PER_EMPLOYER,
  priceForDuration,
} from "@/lib/utils/constants";

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
    job_image_url: formData.get("job_image_url") || null,
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

  const isAdmin =
    !!process.env.ADMIN_EMAIL &&
    user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("employer_id", user.id)
    .eq("is_system", isAdmin)
    .limit(1)
    .maybeSingle();

  if (companyError) {
    console.error("[new job] failed to load company:", companyError);
  }

  let companyId = (company as { id: string } | null)?.id;
  if (!companyId && isAdmin) {
    const { data: createdCompany, error: createCompanyError } =
      await createAdminClient()
        .from("companies")
        .insert({
          employer_id: user.id,
          company_name: "RealJobs",
          is_system: true,
        })
        .select("id")
        .single();

    if (createCompanyError) {
      console.error("[new job] failed to create admin company:", createCompanyError);
      redirect(
        `/dashboard/employer/jobs/new?error=${encodeURIComponent("Could not prepare the admin company profile.")}`
      );
    }
    companyId = createdCompany.id;
  }
  if (!companyId) redirect("/dashboard/employer/company");

  let isFreeJob = false;
  if (!isAdmin) {
    const adminDb = createAdminClient();
    const { data: consumed, error: consumeError } = await adminDb.rpc(
      "consume_free_job",
      { p_company_id: companyId }
    );
    if (consumeError) {
      console.error("[new job] consume_free_job failed:", consumeError);
    } else if (consumed === true) {
      isFreeJob = true;
    }
  }

  // ─── Lock the price at creation time ───
  const priceLkr = isAdmin || isFreeJob ? 0 : priceForDuration(parsed.data.duration_days);
  const publishImmediately =
    (isAdmin && formData.get("publish_immediately") === "on") || isFreeJob;
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + parsed.data.duration_days * 86_400_000
  );

  const jobValues = {
    company_id: companyId,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    work_type: parsed.data.work_type,
    category: parsed.data.category ?? null,
    salary_min: parsed.data.salary_min ?? null,
    salary_max: parsed.data.salary_max ?? null,
    job_image_url: parsed.data.job_image_url ?? null,
    duration_days: parsed.data.duration_days,
    price_lkr: priceLkr,
    expires_at: expiresAt.toISOString(),
    status: publishImmediately ? "ACTIVE" : "DRAFT",
  };
  const insertResult = isAdmin || isFreeJob
    ? await createAdminClient()
        .from("jobs")
        .insert(jobValues as never)
        .select("id")
        .single()
    : await supabase
        .from("jobs")
        .insert(jobValues as never)
        .select("id")
        .single();

  if (insertResult.error || !insertResult.data) {
    redirect(
      `/dashboard/employer/jobs/new?error=${encodeURIComponent(insertResult.error?.message ?? "Could not create the job.")}`
    );
  }

  revalidatePath("/dashboard/employer/jobs");
  const jobId = insertResult.data.id;
  if (publishImmediately) revalidatePath(`/jobs/${jobId}`);
  if (isFreeJob) {
    redirect(`/dashboard/employer/jobs/${jobId}?posted=free`);
  }
  redirect(`/dashboard/employer/jobs/${jobId}`);
}

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const isAdmin =
    !!process.env.ADMIN_EMAIL &&
    user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  let freeJobsRemaining: number | undefined;
  if (!isAdmin) {
    const { data: companyData, error } = await supabase
      .from("companies")
      .select("free_jobs_used")
      .eq("employer_id", user.id)
      .eq("is_system", false)
      .returns<{ free_jobs_used: number }>()
      .maybeSingle();
    if (error) {
      console.error("[new job page] free-claim quota lookup failed:", error);
      throw new Error("Could not load your free sourced-listing quota.");
    }
    const company = companyData as unknown as { free_jobs_used: number } | null;
    if (company) {
      freeJobsRemaining = Math.max(
        0,
        FREE_JOBS_PER_EMPLOYER - company.free_jobs_used
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
      {/* ─── Back link ─── */}
      <Link
        href="/dashboard/employer/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-gray-900 sm:text-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        Back to jobs
      </Link>

      {/* ─── Header ─── */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3.5 shadow-card sm:rounded-2xl sm:p-6">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-100/40 blur-3xl" />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm sm:h-12 sm:w-12 sm:rounded-xl">
            <Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-balance text-lg font-bold tracking-tight text-gray-900 sm:text-2xl">
              Post a new job
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
              {isAdmin
                ? "Create a job listing and choose whether to publish it immediately."
                : <>Save as a draft first — then pay to publish. Plans start at{" "}
                  <strong className="text-gray-700">LKR 2,499</strong> for 7 days.</>}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Error banner ─── */}
      {searchParams.error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 shadow-sm sm:gap-3 sm:px-4 sm:py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 sm:h-8 sm:w-8">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-900 sm:text-base">
              Couldn&apos;t save draft
            </p>
            <p className="mt-0.5 text-xs leading-snug text-rose-800 sm:text-sm">
              {searchParams.error}
            </p>
          </div>
        </div>
      )}

      {/* ─── Info callout ─── */}
      {!isAdmin && <div className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 sm:gap-3 sm:px-4 sm:py-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
        <p className="text-xs leading-relaxed text-indigo-900 sm:text-sm">
          Drafts are private — only you can see them. You&apos;ll be prompted to
          pay before the listing goes live on the public board.
        </p>
      </div>}

      {/* ─── Form card ─── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-card sm:rounded-2xl">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-3.5 py-3 sm:gap-3 sm:px-6 sm:py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 sm:h-9 sm:w-9">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight text-gray-900 sm:text-base">
              Job details
            </h2>
            <p className="truncate text-[11px] text-gray-500 sm:text-xs">
              All fields except salary are required.
            </p>
          </div>
        </div>
        <div className="p-3.5 sm:p-6">
          <JobForm
            action={createJob}
            submitLabel={isAdmin ? "Save job" : "Save as draft"}
            error={undefined}
            isAdmin={isAdmin}
            freeJobsRemaining={freeJobsRemaining}
          />
        </div>
      </div>

      {/* ─── Footer hint ─── */}
      <p className="px-4 text-center text-[11px] text-gray-400 sm:text-xs">
        Need to change something later? You can edit drafts anytime before
        publishing.
      </p>
    </div>
  );
}