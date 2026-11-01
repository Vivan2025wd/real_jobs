import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Trash2, ArrowRight, Briefcase, Building2, Users, Inbox } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type JobListRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  companies: {
    company_name: string;
  } | null;
  applications: { count: number }[]; 
};

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------
async function deleteJob(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error("Unauthorized: Admin access required");
  }

  const jobId = String(formData.get("jobId"));
  const adminDb = createAdminClient();
  
  await adminDb.from("jobs").delete().eq("id", jobId);
  revalidatePath("/admin/jobs");
}

// Helper for status badge colors
const getStatusStyle = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "FILLED":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "EXPIRED":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "ARCHIVED":
      return "bg-gray-100 text-gray-600 ring-gray-200";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200"; // DRAFT
  }
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default async function AdminJobs() {
  const adminDb = createAdminClient();

  const { data: jobs, error } = await adminDb
    .from("jobs")
    .select("id, title, status, created_at, companies(company_name), applications(count)")
    .order("created_at", { ascending: false })
    .returns<JobListRow[]>();

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Jobs & Applications
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 sm:mt-0 sm:text-sm">
            Manage all job listings across the platform.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 sm:gap-2 sm:self-auto sm:px-3 sm:py-1 sm:text-sm">
          <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {jobs?.length || 0} Total Jobs
        </div>
      </div>

      {/* ─── Empty State ─── */}
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          Failed to load jobs. Please try again.
        </div>
      ) : !jobs?.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 sm:h-14 sm:w-14">
            <Inbox className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-gray-900 sm:mt-4 sm:text-lg">
            No jobs found
          </h3>
          <p className="mt-1 max-w-xs text-xs text-gray-500 sm:max-w-sm sm:text-sm">
            No jobs have been posted on the platform yet.
          </p>
        </div>
      ) : (
        /* ─── Jobs List ─── */
        <div className="grid gap-3">
          {jobs.map((job) => {
            const appCount = job.applications?.[0]?.count || 0;
            
            return (
              <div
                key={job.id}
                className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-gray-300 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
              >
                {/* ─── Left: Job Info ─── */}
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 sm:h-10 sm:w-10 sm:rounded-xl">
                    <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                      {job.title}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-gray-500 sm:mt-1 sm:gap-x-3 sm:text-xs">
                      <span className="inline-flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3 shrink-0 text-gray-400 sm:h-3.5 sm:w-3.5" />
                        {job.companies?.company_name || "Unknown Company"}
                      </span>
                      <span className="hidden text-gray-300 sm:inline">·</span>
                      <span className="truncate">
                        {new Date(job.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ─── Right: Status, Apps, Delete ─── */}
                <div className="flex w-full flex-wrap items-center justify-between gap-2 pl-12 sm:w-auto sm:shrink-0 sm:flex-nowrap sm:justify-end sm:gap-3 sm:pl-0">
                  
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ring-1 sm:px-2.5 sm:py-1 sm:text-[10px] ${getStatusStyle(job.status)}`}
                  >
                    {job.status}
                  </span>

                  <Link
                    href={`/admin/jobs/${job.id}`}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:gap-1.5 sm:rounded-lg sm:px-3 sm:text-xs"
                  >
                    <Users className="h-3 w-3 text-gray-400 sm:h-3.5 sm:w-3.5" />
                    {appCount} Applied
                    <ArrowRight className="h-3 w-3 text-gray-400 sm:h-3.5 sm:w-3.5" />
                  </Link>

                  <form action={deleteJob} className="flex items-center">
                    <input type="hidden" name="jobId" value={job.id} />
                    <button
                      type="submit"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 md:min-h-0 md:min-w-0 md:h-8 md:w-8"
                      title="Delete Job"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}