import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatSalary, timeAgo } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Explicit row types — the generated Supabase types return `never` for
// multi-column `.select()` inference and for `.update()` payloads.
// `.returns<T>()` restores the shape for reads; `as never` unblocks writes.
// Regenerate types with:
//   npx supabase gen types typescript --project-id qujvdtpqlsurbeyputfj ^
//     | Out-File src/types/database.types.ts -Encoding utf8
// …then remove the `as never` casts.
// ---------------------------------------------------------------------------
type JobRow = {
  id: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "FILLED" | "EXPIRED" | "ARCHIVED";
  work_type: "REMOTE" | "ONSITE" | "HYBRID";
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  created_at: string;
};

type CompanyId = { id: string };

// ----- Server Actions -----
async function publishJob(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const supabase = await createClient();
  // TODO Phase 3: replace with PayHere checkout. For now, publish immediately.
  await supabase
    .from("jobs")
    .update({ status: "ACTIVE" } as never)
    .eq("id", jobId);

  revalidatePath("/dashboard/employer/jobs");
  revalidatePath("/dashboard/employer");
}

async function markFilled(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const supabase = await createClient();
  await supabase
    .from("jobs")
    .update({ status: "FILLED" } as never)
    .eq("id", jobId);

  revalidatePath("/dashboard/employer/jobs");
  revalidatePath("/dashboard/employer");
}

async function deleteJob(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const supabase = await createClient();
  await supabase.from("jobs").delete().eq("id", jobId);

  revalidatePath("/dashboard/employer/jobs");
  revalidatePath("/dashboard/employer");
}

export default async function EmployerJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("employer_id", user!.id)
    .returns<CompanyId>()
    .maybeSingle();

  const companyId = (company as CompanyId | null)?.id;
  if (!companyId) redirect("/dashboard/employer/company");

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, title, status, work_type, location, salary_min, salary_max, created_at"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .returns<JobRow[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My jobs</h1>
          <p className="text-gray-500">
            Manage your listings and track their status.
          </p>
        </div>
        <Link href="/dashboard/employer/jobs/new">
          <Button>Post a job</Button>
        </Link>
      </div>

      <Card>
        <CardHeader
          title={`${jobs?.length ?? 0} listing${jobs?.length === 1 ? "" : "s"}`}
        />
        <CardBody className="p-0">
          {!jobs?.length ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No jobs yet.{" "}
              <Link
                href="/dashboard/employer/jobs/new"
                className="text-blue-600 hover:underline"
              >
                Post your first job
              </Link>
              .
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link
                      href={`/dashboard/employer/jobs/${job.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {job.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {job.work_type} · {job.location} ·{" "}
                      {formatSalary(job.salary_min, job.salary_max)} ·{" "}
                      {timeAgo(job.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={job.status} />

                    {job.status === "DRAFT" && (
                      <form action={publishJob}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <Button size="sm">Publish</Button>
                      </form>
                    )}

                    {job.status === "ACTIVE" && (
                      <form action={markFilled}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <Button size="sm" variant="secondary">
                          Mark as filled
                        </Button>
                      </form>
                    )}

                    <Link href={`/dashboard/employer/jobs/${job.id}/edit`}>
                      <Button size="sm" variant="ghost">
                        Edit
                      </Button>
                    </Link>

                    <form action={deleteJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}