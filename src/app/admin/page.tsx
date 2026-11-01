import { createAdminClient } from "@/lib/supabase/admin";
import { Users, Briefcase, FileText, Building2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type StatItem = {
  label: string;
  value: number | null;
  hint: string;
  icon: React.ElementType;
  color: string;
  bg: string;
};

export default async function AdminOverview() {
  const adminDb = createAdminClient();

  // Fetch counts in parallel for speed
  const [
    { count: userCount, error: userErr },
    { count: jobCount, error: jobErr },
    { count: appCount, error: appErr },
    { count: companyCount, error: compErr },
  ] = await Promise.all([
    adminDb.from("users").select("*", { count: "exact", head: true }),
    adminDb.from("jobs").select("*", { count: "exact", head: true }),
    adminDb.from("applications").select("*", { count: "exact", head: true }),
    adminDb.from("companies").select("*", { count: "exact", head: true }),
  ]);

  if (userErr || jobErr || appErr || compErr) {
    console.error("[admin/overview] Failed to load stats:", {
      userErr, jobErr, appErr, compErr
    });
  }

  // Structure the stats data
  const stats: StatItem[] = [
    {
      label: "Total Users",
      value: userCount,
      hint: "Registered accounts",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Companies",
      value: companyCount,
      hint: "Hiring entities",
      icon: Building2,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Job Posts",
      value: jobCount,
      hint: "Active & Draft",
      icon: Briefcase,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Applications",
      value: appCount,
      hint: "Total submissions",
      icon: FileText,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Platform Overview
          </h1>
          <p className="text-xs text-gray-500 sm:text-sm">
            A quick snapshot of everything happening on RealJobs.
          </p>
        </div>
      </div>

      {/* ─── Stat Grid ─── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-md sm:rounded-2xl sm:p-5"
          >
            {/* Decorative background gradient */}
            <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full ${s.bg} opacity-50 blur-2xl transition-opacity group-hover:opacity-100 sm:h-24 sm:w-24`} />
            
            <div className="relative">
              {/* Icon */}
              <div
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.bg} ${s.color} ring-1 ring-inset ring-black/5 sm:h-10 sm:w-10 sm:rounded-xl`}
              >
                <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>

              {/* Data */}
              <div className="mt-3 sm:mt-4">
                <p className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  {s.value ?? 0}
                </p>
                <p className="mt-0.5 text-sm font-medium text-gray-900 sm:mt-1">
                  {s.label}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">{s.hint}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}