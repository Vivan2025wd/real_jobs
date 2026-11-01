import Link from "next/link";
import {
  Briefcase,
  Activity,
  FileEdit,
  Users,
  Plus,
  ArrowRight,
  Settings2,
  Building2,
  Inbox,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/utils/format";

type StatConfig = {
  key: "total" | "active" | "draft" | "applications";
  label: string;
  value: number;
  hint: string;
  icon: typeof Briefcase;
  tone: "slate" | "emerald" | "amber" | "indigo";
};

const STAT_TONES: Record<
  StatConfig["tone"],
  { bg: string; icon: string; ring: string }
> = {
  slate: {
    bg: "from-slate-50 to-slate-100/60",
    icon: "bg-white text-slate-600 border-slate-200",
    ring: "ring-slate-100",
  },
  emerald: {
    bg: "from-emerald-50 to-emerald-100/60",
    icon: "bg-white text-emerald-600 border-emerald-200",
    ring: "ring-emerald-100",
  },
  amber: {
    bg: "from-amber-50 to-amber-100/60",
    icon: "bg-white text-amber-600 border-amber-200",
    ring: "ring-amber-100",
  },
  indigo: {
    bg: "from-indigo-50 to-violet-50",
    icon: "bg-white text-indigo-600 border-indigo-200",
    ring: "ring-indigo-100",
  },
};

export default async function EmployerOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("id, company_name")
    .eq("employer_id", user!.id)
    .limit(1)
    .maybeSingle();

  if (companyError) {
    console.error("[employer overview] failed to load company:", companyError);
  }

  const company = companyData as { id: string; company_name: string } | null;

  // ─── Empty state: no company yet ───
  if (!company) {
    return (
      <div className="mx-auto w-full max-w-2xl py-6 sm:py-10">
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 text-center shadow-card sm:rounded-2xl sm:p-10">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-indigo-100/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-violet-100/40 blur-3xl" />

          <div className="relative">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md sm:h-16 sm:w-16 sm:rounded-2xl">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>

            <h1 className="mt-4 text-balance text-xl font-bold tracking-tight text-gray-900 sm:mt-6 sm:text-3xl">
              Welcome to RealJobs
            </h1>
            <p className="mx-auto mt-2 max-w-md text-balance text-sm text-gray-600 sm:mt-3 sm:text-base">
              Set up your company profile to start posting jobs and receiving
              applications from verified candidates.
            </p>

            <div className="mt-6 flex w-full flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center">
              <Link href="/dashboard/employer/company" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  iconRight={<ArrowRight className="h-4 w-4" />}
                  className="w-full justify-center sm:w-auto"
                >
                  Create company profile
                </Button>
              </Link>
            </div>

            <div className="mx-auto mt-8 grid max-w-sm gap-2.5 text-left sm:mt-10 sm:gap-3">
              {[
                "Add your company name, logo, and description",
                "Post your first job listing",
                "Pay the LKR 2,500 fee to publish",
                "Start receiving applications",
              ].map((step, i) => (
                <div
                  key={step}
                  className="flex items-start gap-2.5 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 text-xs text-gray-700 sm:gap-3 sm:py-2.5 sm:text-sm"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-indigo-600 shadow-sm ring-1 ring-indigo-100 sm:text-xs">
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Stats ───
  const [
    { count: totalJobs },
    { count: activeJobs },
    { count: draftJobs },
    { count: totalApplications },
  ] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "ACTIVE"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "DRAFT"),
    supabase.from("applications").select("id, jobs!inner(company_id)", { count: "exact", head: true }).eq("jobs.company_id", company.id),
  ]);

  const stats: StatConfig[] = [
    {
      key: "total",
      label: "Total jobs",
      value: totalJobs ?? 0,
      hint: "All listings",
      icon: Briefcase,
      tone: "slate",
    },
    {
      key: "active",
      label: "Active jobs",
      value: activeJobs ?? 0,
      hint: "Live on the board",
      icon: Activity,
      tone: "emerald",
    },
    {
      key: "draft",
      label: "Drafts",
      value: draftJobs ?? 0,
      hint: "Not yet published",
      icon: FileEdit,
      tone: "amber",
    },
    {
      key: "applications",
      label: "Applications",
      value: totalApplications ?? 0,
      hint: "Across all jobs",
      icon: Users,
      tone: "indigo",
    },
  ];

  // ─── Recent applications ───
  const { data: recentApplicationsData, error: recentError } = await supabase
    .from("applications")
    .select("id, status, applied_at, jobs!inner(title, company_id), users!inner(email)")
    .eq("jobs.company_id", company.id)
    .order("applied_at", { ascending: false })
    .limit(5);

  if (recentError) {
    console.error(
      "[employer overview] recent applications failed:",
      recentError
    );
  }

  const recentApplications = recentApplicationsData as unknown as {
    id: string;
    status: Parameters<typeof StatusBadge>[0]["status"];
    applied_at: string;
    jobs: { title: string; company_id: string };
    users: { email: string };
  }[] | null;

  return (
    <div className="w-full space-y-5 sm:space-y-8">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-xl sm:text-base">
              {company.company_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-balance text-xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {company.company_name}
              </h1>
              <p className="truncate text-xs text-gray-500 sm:text-sm">
                Here&apos;s what&apos;s happening with your hiring pipeline.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile එකේදී Buttons පැත්තට පැත්ත එන්න හදමු */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center">
          <Link href="/dashboard/employer/company" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              icon={<Settings2 className="h-4 w-4" />}
              className="w-full justify-center sm:w-auto"
            >
              Company
            </Button>
          </Link>
          <Link href="/dashboard/employer/jobs/new" className="w-full sm:w-auto">
            <Button icon={<Plus className="h-4 w-4" />} className="w-full justify-center sm:w-auto">
              Post a job
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Stat cards ─── */}
      {/* මොබයිල් එකේදී 2 columns (grid-cols-2) කළා, එතකොට ඉඩ ඉතුරු වෙනවා */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const tone = STAT_TONES[s.tone];
          return (
            <div
              key={s.key}
              className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br ${tone.bg} p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:p-5`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-white shadow-sm sm:h-9 sm:w-9 sm:rounded-lg ${tone.icon}`}
                >
                  <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <span
                  className={`truncate rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-gray-500 ring-1 sm:px-2 sm:text-[10px] ${tone.ring}`}
                >
                  {s.hint}
                </span>
              </div>
              <p className="mt-2.5 text-xs font-medium text-gray-600 sm:mt-4 sm:text-sm">{s.label}</p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-gray-900 sm:mt-1 sm:text-3xl">
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* ─── Recent applications ─── */}
      <Card>
        <CardHeader
          title="Recent applications"
          description={
            recentApplications?.length
              ? "The latest candidates who applied to your jobs."
              : undefined
          }
          icon={<Inbox className="h-4 w-4" />}
          action={
            <Link href="/dashboard/employer/jobs">
              <Button
                variant="ghost"
                size="sm"
                iconRight={<ChevronRight className="h-3.5 w-3.5" />}
                className="px-2 text-xs sm:px-3 sm:text-sm"
              >
                View all jobs
              </Button>
            </Link>
          }
        />
        <CardBody className="p-0">
          {!recentApplications?.length ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center sm:px-6 sm:py-14">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 sm:h-12 sm:w-12">
                <Inbox className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 sm:text-base">No applications yet</p>
                <p className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
                  Applications will show up here as soon as candidates apply.
                </p>
              </div>
              <Link href="/dashboard/employer/jobs" className="mt-1 w-full sm:w-auto">
                <Button variant="secondary" size="sm" className="w-full justify-center sm:w-auto">
                  View your jobs
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentApplications.map((a) => {
                const job = a.jobs as { title: string; company_id: string };
                const seeker = a.users as { email: string };
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2.5 px-3.5 py-3 transition hover:bg-gray-50/60 sm:gap-3 sm:px-6 sm:py-4"
                  >
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-semibold text-indigo-700 sm:h-10 sm:w-10 sm:text-sm">
                        {seeker.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-900 sm:text-base">
                          {seeker.email}
                        </p>
                        <p className="truncate text-[10px] text-gray-500 sm:text-xs">
                          Applied to{" "}
                          <span className="font-medium text-gray-700">
                            {job.title}
                          </span>{" "}
                          · {timeAgo(a.applied_at)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={a.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}