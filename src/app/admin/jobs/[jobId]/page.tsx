import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { ArrowLeft, FileText, Mail, Calendar, Inbox } from "lucide-react";

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
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/jobs"
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              {job?.title || "Job Details"}
            </h1>
            <p className="mt-0.5 truncate text-sm text-gray-500">
              at {job?.companies?.company_name || "Unknown Company"}
            </p>
          </div>
        </div>
        
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 sm:self-auto">
          <Inbox className="h-4 w-4" />
          {applications?.length || 0} Applicants
        </div>
      </div>

      {/* ─── Empty State ─── */}
      {!applications?.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No applications yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Candidates who apply to this job will appear here.
          </p>
        </div>
      ) : (
        /* ─── Application List ─── */
        <div className="grid gap-3 sm:gap-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              
              {/* Left side: Candidate Info */}
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-bold text-indigo-700 sm:h-12 sm:w-12">
                  {app.users?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                    {app.users?.email || "Unknown Email"}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    Applied on {new Date(app.applied_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </div>
                </div>
              </div>

              {/* Right side: Status & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:shrink-0 pl-14 sm:pl-0">
                {/* Status Badge */}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ring-1 ${getStatusStyle(app.status)}`}
                >
                  {app.status}
                </span>

                {/* Resume Action */}
                <a
                  href={app.resume_url} // In production, use a presigned URL generator for admin
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <FileText className="h-3.5 w-3.5 text-gray-400 group-hover:text-indigo-500" />
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