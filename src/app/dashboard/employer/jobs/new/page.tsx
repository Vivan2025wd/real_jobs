import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/employer/JobForm";
import { jobSchema } from "@/lib/validators/job";

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
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    redirect(`/dashboard/employer/jobs/new?error=${encodeURIComponent(msg)}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("employer_id", user.id)
    .maybeSingle();

  const companyId = (company as { id: string } | null)?.id;
  if (!companyId) redirect("/dashboard/employer/company");

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
      status: "DRAFT",
    } as never)
    .select("id")
    .single();

  if (error) {
    redirect(`/dashboard/employer/jobs/new?error=${encodeURIComponent(error.message)}`);
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
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Post a new job</h1>
      <p className="mt-1 text-gray-500">
        Save as draft first — publish when ready (payment integration coming soon).
      </p>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <JobForm action={createJob} submitLabel="Save as draft" error={searchParams.error} />
      </div>
    </div>
  );
}