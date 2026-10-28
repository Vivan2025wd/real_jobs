import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  MapPin,
  Banknote,
  Clock,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Rocket,
  Briefcase,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatSalary, timeAgo } from "@/lib/utils/format";
import type { JobListRow } from "@/types/job";

// ---------------------------------------------------------------------------
// `JobListRow` (from @/types/job) mirrors exactly the columns selected below.
// Keeping the row type close to the select string ensures `.map()` access to
// any un-selected column is caught at compile time.
// ---------------------------------------------------------------------------
type CompanyId = { id: string };

const WORK_TYPE_LABEL: Record<string, string> = {
  REMOTE: "Remote",
  ONSITE: "On-site",
  HYBRID: "Hybrid",
};

// ----- Server Actions -----
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
    .returns<JobListRow[]>();

  const total = jobs?.length ?? 0;
  const activeCount = jobs?.filter((j) => j.status === "ACTIVE").length ?? 0;
  const draftCount = jobs?.filter((j) => j.status === "DRAFT").length ?? 0;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl text-balance">
            My jobs
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your listings and track their status.
          </p>

          {total > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>
                <strong className="text-gray-900">{total}</strong> total
              </span>
              <span className="text-gray-300">·</span>
              <span>
                <strong className="text-emerald-600">{activeCount}</strong>{" "}
                active
              </span>
              <span className="text-gray-300">·</span>
              <span>
                <strong className="text-gray-700">{draftCount}</strong> draft
              </span>
            </div>
          )}
        </div>

        <Link href="/dashboard/employer/jobs/new" className="shrink-0">
          <Button icon={<Plus className="h-4 w-4" />}>Post a job</Button>
        </Link>
      </div>

      {/* ─── Jobs list ─── */}
      <Card>
        <CardHeader
          title={`${total} listing${total === 1 ? "" : "s"}`}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <CardBody className="p-0">
          {!jobs?.length ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600">
                <Inbox className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-gray-900">
                  No jobs yet
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Post your first listing to start receiving applications.
                </p>
              </div>
              <Link href="/dashboard/employer/jobs/new">
                <Button icon={<Plus className="h-4 w-4" />}>
                  Post your first job
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="group flex flex-col gap-4 px-4 py-4 transition hover:bg-gray-50/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5"
                >
                  {/* Left: title + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      <Link
                        href={`/dashboard/employer/jobs/${job.id}`}
                        className="truncate font-semibold tracking-tight text-gray-900 transition hover:text-indigo-700"
                      >
                        {job.title}
                      </Link>
                      <StatusBadge status={job.status} />
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {job.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Banknote className="h-3.5 w-3.5 text-gray-400" />
                        {formatSalary(job.salary_min, job.salary_max)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        {timeAgo(job.created_at)}
                      </span>
                      <span className="hidden text-gray-300 sm:inline">·</span>
                      <span className="hidden text-gray-400 sm:inline">
                        {WORK_TYPE_LABEL[job.work_type] ?? job.work_type}
                      </span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    {job.status === "DRAFT" && (
                      <Link href={`/dashboard/employer/jobs/${job.id}?pay=1`}>
                        <Button
                          size="sm"
                          icon={<Rocket className="h-3.5 w-3.5" />}
                        >
                          Publish
                        </Button>
                      </Link>
                    )}

                    {job.status === "ACTIVE" && (
                      <form action={markFilled}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        >
                          Mark filled
                        </Button>
                      </form>
                    )}

                    <Link href={`/dashboard/employer/jobs/${job.id}/edit`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Edit3 className="h-3.5 w-3.5" />}
                      >
                        Edit
                      </Button>
                    </Link>

                    <form action={deleteJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        className="text-rose-600 hover:bg-rose-50"
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