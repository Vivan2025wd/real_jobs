import { createAdminClient } from "@/lib/supabase/admin";
import { Building2, Mail, Briefcase, Users, ChevronRight } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types for the nested query
// ---------------------------------------------------------------------------
type Job = {
  id: string;
  title: string;
  status: string;
};

type CompanyWithDetails = {
  id: string;
  company_name: string;
  employer_id: string;
  users: {
    email: string;
  } | null;
  jobs: Job[] | null;
};

export default async function AdminCompanies() {
  const adminDb = createAdminClient();

  // Fetch companies with nested employer email and jobs
  const { data: companies, error } = await adminDb
    .from("companies")
    .select("id, company_name, employer_id, users(email), jobs(id, title, status)")
    .order("created_at", { ascending: false })
    .returns<CompanyWithDetails[]>();

  if (error) {
    console.error("[admin/companies] failed to load:", error);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Companies
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 sm:mt-0 sm:text-sm">
            Manage registered companies and view their job listings.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 sm:self-auto sm:gap-2 sm:px-3 sm:text-sm">
          <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {companies?.length || 0} Total
        </div>
      </div>

      {/* ─── Empty State ─── */}
      {!companies?.length && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 sm:h-14 sm:w-14">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-gray-900 sm:mt-4 sm:text-lg">
            No companies yet
          </h3>
          <p className="mt-1 max-w-xs text-xs text-gray-500 sm:max-w-sm sm:text-sm">
            Companies will appear here once employers create their profiles.
          </p>
        </div>
      )}

      {/* ─── Company List ─── */}
      <div className="grid gap-3 sm:gap-5">
        {companies?.map((company) => (
          <div
            key={company.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-gray-300 sm:rounded-2xl"
          >
            {/* ─── Company Header ─── */}
            <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/50 p-3.5 sm:flex-row sm:items-start sm:justify-between sm:p-5">
              
              <div className="flex min-w-0 items-start gap-2.5 sm:gap-3.5">
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-xl sm:text-sm">
                  {company.company_name.charAt(0).toUpperCase()}
                </div>
                
                {/* Name & Email */}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                    {company.company_name}
                  </h2>
                  <div className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-gray-500 sm:mt-1 sm:flex-row sm:items-center sm:gap-3 sm:text-sm">
                    <span className="inline-flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0 text-gray-400 sm:h-3.5 sm:w-3.5" />
                      <span className="truncate">{company.users?.email || "No email"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Jobs Count Badge */}
              <div className="flex shrink-0 items-center gap-1.5 self-start rounded-md border border-gray-200 bg-white px-2.5 py-1 shadow-sm sm:self-auto sm:gap-2 sm:rounded-lg sm:px-3 sm:py-1.5">
                <Briefcase className="h-3.5 w-3.5 text-indigo-500 sm:h-4 sm:w-4" />
                <span className="text-xs font-semibold text-gray-700 sm:text-sm">
                  {company.jobs?.length || 0} Jobs
                </span>
              </div>
            </div>

            {/* ─── Jobs List ─── */}
            <div className="p-3.5 sm:p-5">
              {company.jobs && company.jobs.length > 0 ? (
                <ul className="space-y-2 sm:space-y-2.5">
                  {company.jobs.map((job) => (
                    <li
                      key={job.id}
                      className="group flex flex-col justify-between gap-2.5 rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md sm:flex-row sm:items-center sm:rounded-xl sm:p-3.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 sm:h-8 sm:w-8 sm:rounded-lg">
                          <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                        <span className="truncate text-xs font-medium text-gray-900 group-hover:text-indigo-700 sm:text-sm">
                          {job.title}
                        </span>
                      </div>
                      
                      <div className="flex shrink-0 items-center gap-2 pl-9 sm:pl-0">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider sm:px-2.5 sm:text-[10px] ${
                            job.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                          }`}
                        >
                          {job.status}
                        </span>
                        <Link 
                          href={`/admin/jobs/${job.id}`}
                          className="text-gray-400 transition hover:text-indigo-600"
                        >
                          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500 sm:gap-3 sm:rounded-xl sm:p-4 sm:text-sm">
                  <Users className="h-4 w-4 shrink-0 text-gray-400 sm:h-5 sm:w-5" />
                  This company hasn&apos;t posted any jobs yet.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}