import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/employer/JobForm";
import { jobSchema } from "@/lib/validators/job";

// ---------- Explicit row types ----------
type JobEditRow = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string;
  work_type: "REMOTE" | "ONSITE" | "HYBRID";
  category: "ENGINEERING" | "DESIGN" | "MARKETING" | "SALES" | "CUSTOMER_SUPPORT" | "FINANCE" | "OPERATIONS" | "HR" | "OTHER" | null;
  salary_min: number | null;
  salary_max: number | null;
  status: string;
  created_at: string;
  last_verified_at: string | null;
};

type CompanyRow = { employer_id: string };

// ---------- Server Action ----------
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

  // Cast to `any` to bypass stale generated types on `jobs.Update`.
  // Once you regenerate database.types.ts this cast can be removed.
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

  // 1) Fetch the job without a join — avoids relation type inference.
  const { data: jobRaw } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", params.jobId)
    .maybeSingle();

  const job = jobRaw as JobEditRow | null;
  if (!job) notFound();

  // 2) Verify ownership with a separate company query.
  const { data: companyRaw } = await supabase
    .from("companies")
    .select("employer_id")
    .eq("id", job.company_id)
    .maybeSingle();

  const company = companyRaw as CompanyRow | null;
  if (!company || company.employer_id !== user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Edit job</h1>
      <p className="mt-1 text-gray-500">
        Update the listing — changes are visible immediately.
      </p>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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
  );
}