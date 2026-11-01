import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar, Inbox } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type JobHeader = {
  title: string;
  companies: {
    company_name: string;
  } | null;
};

type ApplicationRow = {
  id: string;
  status: string;
  applied_at: string;
  resume_url: string;
  users: {
    email: string;
  } | null;
};

// Helper to colorize status badges
const getStatusStyle = (status: string) => {
  switch (status) {
    case "SHORTLISTED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "REVIEWED":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200"; // PENDING
  }
};

export default async function JobApplications({ 
  params 
}: { 
  params: { jobId: string } 
}) {
  const adminDb = createAdminClient();

  // 1. Fetch Job Details
  const { data: jobData } = await adminDb
    .from("jobs")
    .select("title, companies(company_name)")
    .eq("id", params.jobId)
    .maybeSingle();

  const job = jobData as JobHeader | null;

  // 2. Fetch Applications
  const { data: applications } = await adminDb
    .from("applications")
    .select("id, status, applied_at, resume_url, users!inner(email)")
    .eq("job_id", params.jobId)
    .order("applied_at", { ascending: false })
    .returns<ApplicationRow[]>();

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link
            href="/admin/jobs"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 sm:mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-gray-900 sm:text-2xl">
              {job?.title || "Job Details"}
            </h1>
            <p className="mt-0.5 truncate text-xs text-gray-500 sm:text-sm">
              at {job?.companies?.company_name || "Unknown Company"}
            </p>
          </div>
        </div>
        
        <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 sm:gap-2 sm:self-auto sm:px-3 sm:py-1 sm:text-sm">
          <Inbox className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {applications?.length || 0} Applicants
        </div>
      </div>

      {/* ─── Empty State ─── */}
      {!applications?.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 sm:h-14 sm:w-14">
            <Inbox className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-gray-900 sm:mt-4 sm:text-lg">
            No applications yet
          </h3>
          <p className="mt-1 max-w-xs text-xs text-gray-500 sm:max-w-sm sm:text-sm">
            Candidates who apply to this job will appear here.
          </p>
        </div>
      ) : (
        /* ─── Application List ─── */
        <div className="grid gap-3 sm:gap-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-gray-300 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:gap-4"
            >
              
              {/* Left side: Candidate Info */}
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-bold text-indigo-700 sm:h-12 sm:w-12 sm:text-sm">
                  {app.users?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                    {app.users?.email || "Unknown Email"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500 sm:mt-1 sm:text-xs">
                    <Calendar className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                    Applied on {new Date(app.applied_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </div>
                </div>
              </div>

              {/* Right side: Status & Actions (මොබයිල් එකේදී පහළින්, ඩෙස්ක්ටොප් එකේදී දකුණු පැත්තේ) */}
              <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:justify-end sm:gap-3 pl-12 sm:pl-0">
                {/* Status Badge */}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ring-1 sm:px-2.5 sm:py-1 sm:text-[10px] ${getStatusStyle(app.status)}`}
                >
                  {app.status}
                </span>

                {/* Resume Action */}
                <a
                  href={app.resume_url} // In production, use a presigned URL generator for admin
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:gap-1.5 sm:rounded-lg sm:px-3 sm:text-xs"
                >
                  <FileText className="h-3 w-3 text-gray-400 group-hover:text-indigo-500 sm:h-3.5 sm:w-3.5" />
                  View Resume
                </a>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}