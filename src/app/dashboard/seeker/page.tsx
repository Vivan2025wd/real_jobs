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

// ---------------------------------------------------------------------------
// `ApplicationWithJob` (from @/types/job) matches the select string below
// column-for-column: id, status, applied_at, jobs(title, companies(company_name)).
// The `as unknown as` cast is still required because PostgREST's two-level
// embed collapses the row type to `never` before `.returns<T>()` applies.
// ---------------------------------------------------------------------------

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
    <div className="space-y-8">
      {/* ─── Welcome header ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-indigo-50/40 p-4 shadow-card sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-violet-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white shadow-md">
              {user?.email?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl text-balance">
                Welcome back 👋
              </h1>
              <p className="mt-1 truncate text-sm text-gray-500">
                {user?.email}
              </p>
            </div>
          </div>

          <Link href="/jobs" className="shrink-0">
            <Button
              icon={<Sparkles className="h-4 w-4" />}
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              Browse jobs
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Stat cards ─── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const tone = STAT_TONES[s.tone];
          return (
            <div
              key={s.label}
              className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br ${tone.bg} p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-white shadow-sm ${tone.icon}`}
                >
                  <s.icon className="h-4 w-4" />
                </div>
                <span
                  className={`rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 ring-1 ${tone.ring}`}
                >
                  {s.hint}
                </span>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-600">
                {s.label}
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
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
                >
                  View all
                </Button>
              </Link>
            ) : undefined
          }
        />
        <CardBody className="p-0">
          {!recent?.length ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600">
                <Inbox className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-gray-900">
                  Your job search starts here
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
                  Once you apply to a role, it will show up here with its
                  current status — pending, reviewed, or shortlisted.
                </p>
              </div>
              <Link href="/jobs">
                <Button
                  icon={<Sparkles className="h-4 w-4" />}
                  iconRight={<ArrowRight className="h-4 w-4" />}
                >
                  Find your first role
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-gray-50/60 sm:px-6 sm:py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-semibold text-indigo-700">
                      {a.jobs.companies.company_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {a.jobs.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500">
                        <Building2 className="h-3 w-3 shrink-0 text-gray-400" />
                        {a.jobs.companies.company_name}
                        <span className="text-gray-300">·</span>
                        {timeAgo(a.applied_at)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}