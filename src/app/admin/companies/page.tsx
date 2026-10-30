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
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Companies
          </h1>
          <p className="text-sm text-gray-500">
            Manage registered companies and view their job listings.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 self-start sm:self-auto">
          <Building2 className="h-4 w-4" />
          {companies?.length || 0} Total
        </div>
      </div>

      {/* ─── Empty State ─── */}
      {!companies?.length && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No companies yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Companies will appear here once employers create their profiles.
          </p>
        </div>
      )}

      {/* ─── Company List ─── */}
      <div className="grid gap-4 sm:gap-6">
        {companies?.map((company) => (
          <div
            key={company.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:border-gray-300"
          >
            {/* ─── Company Header ─── */}
            <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6 bg-gray-50/50">
              
              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm sm:h-12 sm:w-12 sm:text-base">
                  {company.company_name.charAt(0).toUpperCase()}
                </div>
                
                {/* Name & Email */}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
                    {company.company_name}
                  </h2>
                  <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 text-xs sm:text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{company.users?.email || "No email"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Jobs Count Badge */}
              <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto rounded-lg bg-white border border-gray-200 px-3 py-1.5 shadow-sm">
                <Briefcase className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">
                  {company.jobs?.length || 0} Jobs
                </span>
              </div>
            </div>

            {/* ─── Jobs List ─── */}
            <div className="p-4 sm:p-6">
              {company.jobs && company.jobs.length > 0 ? (
                <ul className="space-y-2 sm:space-y-3">
                  {company.jobs.map((job) => (
                    <li
                      key={job.id}
                      className="group flex flex-col justify-between gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md sm:flex-row sm:items-center sm:p-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <span className="truncate text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                          {job.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0 pl-11 sm:pl-0">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${
                            job.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                          }`}
                        >
                          {job.status}
                        </span>
                        <Link 
                          href={`/admin/jobs/${job.id}`}
                          className="text-gray-400 hover:text-indigo-600 transition"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                  <Users className="h-5 w-5 text-gray-400" />
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