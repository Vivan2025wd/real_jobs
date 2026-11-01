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

type CompanyId = { id: string };

const WORK_TYPE_LABEL: Record<string, string> = {
  REMOTE: "Remote",
  ONSITE: "On-site",
  HYBRID: "Hybrid",
};

// ----- Server Actions -----
async function markFilled(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  await supabase
    .from("jobs")
    .update({ status: "FILLED" } as never)
    .eq("id", jobId);

  revalidatePath("/dashboard/employer/jobs");
  revalidatePath("/dashboard/employer");
}

async function deleteJob(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  await supabase.from("jobs").delete().eq("id", jobId);

  revalidatePath("/dashboard/employer/jobs");
  revalidatePath("/dashboard/employer");
}

export default async function EmployerJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("employer_id", user!.id)
    .limit(1)
    .returns<CompanyId>()
    .maybeSingle();

  if (companyError) {
    console.error("[employer jobs] failed to load company:", companyError);
  }

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
    <div className="w-full space-y-5 sm:space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-balance text-xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            My jobs
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Manage your listings and track their status.
          </p>

          {total > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 sm:mt-3 sm:gap-x-4 sm:text-xs">
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

        {/* Mobile එකේදී Full width button එකක් */}
        <div className="w-full sm:w-auto sm:shrink-0">
          <Link href="/dashboard/employer/jobs/new" className="block w-full">
            <Button 
              icon={<Plus className="h-4 w-4" />} 
              className="w-full justify-center sm:w-auto"
            >
              Post a job
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Jobs list ─── */}
      <Card>
        <CardHeader
          title={`${total} listing${total === 1 ? "" : "s"}`}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <CardBody className="p-0">
          {!jobs?.length ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center sm:gap-4 sm:px-6 sm:py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 sm:h-14 sm:w-14">
                <Inbox className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                  No jobs yet
                </p>
                <p className="mt-1 max-w-[250px] text-xs text-gray-500 sm:max-w-none sm:text-sm">
                  Post your first listing to start receiving applications.
                </p>
              </div>
              <Link href="/dashboard/employer/jobs/new" className="mt-1 w-full sm:w-auto">
                <Button icon={<Plus className="h-4 w-4" />} className="w-full justify-center sm:w-auto">
                  Post your first job
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="group flex flex-col gap-3 px-3.5 py-4 transition hover:bg-gray-50/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5"
                >
                  {/* Left: title + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      <Link
                        href={`/dashboard/employer/jobs/${job.id}`}
                        className="truncate text-sm font-semibold tracking-tight text-gray-900 transition hover:text-indigo-700 sm:text-base"
                      >
                        {job.title}
                      </Link>
                      <StatusBadge status={job.status} />
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-gray-500 sm:mt-1.5 sm:gap-x-4 sm:text-xs">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400 sm:h-3.5 sm:w-3.5" />
                        {job.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Banknote className="h-3 w-3 text-gray-400 sm:h-3.5 sm:w-3.5" />
                        {formatSalary(job.salary_min, job.salary_max)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        {timeAgo(job.created_at)}
                      </span>
                      <span className="hidden text-gray-300 sm:inline">·</span>
                      <span className="hidden text-gray-400 sm:inline">
                        {WORK_TYPE_LABEL[job.work_type] ?? job.work_type}
                      </span>
                    </div>
                  </div>

                  {/* Right: actions (Mobile grid wrap) */}
                  <div className="flex w-full flex-wrap items-center gap-2 pl-0 sm:w-auto sm:shrink-0 sm:flex-nowrap">
                    {job.status === "DRAFT" && (
                      <div className="w-full sm:w-auto">
                        <Link href={`/dashboard/employer/jobs/${job.id}?pay=1`} className="block w-full">
                          <Button
                            size="sm"
                            icon={<Rocket className="h-3.5 w-3.5" />}
                            className="w-full justify-center sm:w-auto"
                          >
                            Publish
                          </Button>
                        </Link>
                      </div>
                    )}

                    {job.status === "ACTIVE" && (
                      <form action={markFilled} className="w-full sm:w-auto">
                        <input type="hidden" name="jobId" value={job.id} />
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          className="w-full justify-center sm:w-auto"
                        >
                          Mark filled
                        </Button>
                      </form>
                    )}

                    {/* Edit සහ Delete බටන්ස් මොබයිල් එකේදී පැත්තට පැත්ත එන්න හදමු */}
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-2">
                      <Link href={`/dashboard/employer/jobs/${job.id}/edit`} className="w-full sm:w-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Edit3 className="h-3.5 w-3.5" />}
                          className="w-full justify-center sm:w-auto"
                        >
                          Edit
                        </Button>
                      </Link>

                      <form action={deleteJob} className="w-full sm:w-auto">
                        <input type="hidden" name="jobId" value={job.id} />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          className="w-full justify-center text-rose-600 hover:bg-rose-50 sm:w-auto"
                        >
                          Delete
                        </Button>
                      </form>
                    </div>
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