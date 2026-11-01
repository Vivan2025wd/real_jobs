import Link from "next/link";
import {
  Send,
  Clock,
  Eye,
  Star,
  ArrowRight,
  Sparkles,
  Inbox,
  ChevronRight,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils/format";
import type { ApplicationWithJob } from "@/types/job";

// ─── Stat tone palette ───────────────────────────────────────────────
const STAT_TONES = {
  indigo: {
    bg: "from-indigo-50 to-violet-50",
    icon: "text-indigo-600 border-indigo-200",
    ring: "ring-indigo-100",
  },
  amber: {
    bg: "from-amber-50 to-amber-100/60",
    icon: "text-amber-600 border-amber-200",
    ring: "ring-amber-100",
  },
  sky: {
    bg: "from-sky-50 to-sky-100/60",
    icon: "text-sky-600 border-sky-200",
    ring: "ring-sky-100",
  },
  emerald: {
    bg: "from-emerald-50 to-emerald-100/60",
    icon: "text-emerald-600 border-emerald-200",
    ring: "ring-emerald-100",
  },
} as const;

type Tone = keyof typeof STAT_TONES;

export default async function SeekerOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─── Stats (parallel) ───
  const [
    { count: totalApps },
    { count: pendingApps },
    { count: reviewedApps },
    { count: shortlistedApps },
  ] = await Promise.all([
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("seeker_id", user!.id),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("seeker_id", user!.id)
      .eq("status", "PENDING"),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("seeker_id", user!.id)
      .eq("status", "REVIEWED"),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("seeker_id", user!.id)
      .eq("status", "SHORTLISTED"),
  ]);

  // ─── Recent applications ───
  const { data: recentData } = await supabase
    .from("applications")
    .select(
      "id, status, applied_at, jobs!inner(title, companies!inner(company_name))"
    )
    .eq("seeker_id", user!.id)
    .order("applied_at", { ascending: false })
    .limit(5);

  const recent = recentData as unknown as ApplicationWithJob[] | null;

  const stats: {
    label: string;
    value: number;
    hint: string;
    icon: typeof Send;
    tone: Tone;
  }[] = [
    {
      label: "Applications",
      value: totalApps ?? 0,
      hint: "All time",
      icon: Send,
      tone: "indigo",
    },
    {
      label: "Awaiting response",
      value: pendingApps ?? 0,
      hint: "Pending",
      icon: Clock,
      tone: "amber",
    },
    {
      label: "Reviewed",
      value: reviewedApps ?? 0,
      hint: "In progress",
      icon: Eye,
      tone: "sky",
    },
    {
      label: "Shortlisted",
      value: shortlistedApps ?? 0,
      hint: "Positive",
      icon: Star,
      tone: "emerald",
    },
  ];

  const hasApplications = (totalApps ?? 0) > 0;

  return (
    <div className="w-full space-y-5 sm:space-y-8">
      {/* ─── Welcome header ─── */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white via-white to-indigo-50/40 p-3.5 shadow-card sm:rounded-2xl sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-violet-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-bold text-white shadow-md sm:h-14 sm:w-14 sm:rounded-2xl sm:text-xl">
              {user?.email?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <h1 className="text-balance text-lg font-bold tracking-tight text-gray-900 sm:text-3xl">
                Welcome back 👋
              </h1>
              <p className="mt-0.5 truncate text-xs text-gray-500 sm:mt-1 sm:text-sm">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto sm:shrink-0">
            <Link href="/jobs" className="block w-full">
              <Button
                icon={<Sparkles className="h-4 w-4" />}
                iconRight={<ArrowRight className="h-4 w-4" />}
                className="w-full justify-center sm:w-auto"
              >
                Browse jobs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Stat cards ─── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const tone = STAT_TONES[s.tone];
          return (
            <div
              key={s.label}
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
              <p className="mt-2.5 text-xs font-medium text-gray-600 sm:mt-4 sm:text-sm">
                {s.label}
              </p>
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
            recent?.length
              ? "Your latest activity, newest first."
              : undefined
          }
          icon={<Send className="h-4 w-4" />}
          action={
            hasApplications ? (
              <Link href="/dashboard/seeker/applications">
                <Button
                  variant="ghost"
                  size="sm"
                  iconRight={<ChevronRight className="h-3.5 w-3.5" />}
                  className="px-2 text-xs sm:px-3 sm:text-sm"
                >
                  View all
                </Button>
              </Link>
            ) : undefined
          }
        />
        <CardBody className="p-0">
          {!recent?.length ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center sm:gap-4 sm:px-6 sm:py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 sm:h-14 sm:w-14 sm:rounded-2xl">
                <Inbox className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                  Your job search starts here
                </p>
                <p className="mx-auto mt-1 max-w-[260px] text-balance text-xs text-gray-500 sm:max-w-sm sm:text-sm">
                  Once you apply to a role, it will show up here with its
                  current status — pending, reviewed, or shortlisted.
                </p>
              </div>
              <div className="mt-1 w-full sm:w-auto">
                <Link href="/jobs" className="block w-full">
                  <Button
                    icon={<Sparkles className="h-4 w-4" />}
                    iconRight={<ArrowRight className="h-4 w-4" />}
                    className="w-full justify-center sm:w-auto"
                  >
                    Find your first role
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2.5 px-3.5 py-3 transition hover:bg-gray-50/60 sm:gap-3 sm:px-6 sm:py-4"
                >
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-semibold text-indigo-700 sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm">
                      {a.jobs.companies.company_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 sm:text-base">
                        {a.jobs.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-gray-500 sm:gap-1.5 sm:text-xs">
                        <Building2 className="h-2.5 w-2.5 shrink-0 text-gray-400 sm:h-3 sm:w-3" />
                        {a.jobs.companies.company_name}
                        <span className="text-gray-300">·</span>
                        {timeAgo(a.applied_at)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={a.status} />
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