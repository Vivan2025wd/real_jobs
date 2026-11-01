import Link from "next/link";
import {
  Send,
  Clock,
  Eye,
  Star,
  ArrowRight,
  Inbox,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ApplicationCard } from "@/components/applications/ApplicationCard";
import { Button } from "@/components/ui/Button";
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

export default async function SeekerApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, status, applied_at, jobs!inner(title, companies!inner(company_name))"
    )
    .eq("seeker_id", user!.id)
    .order("applied_at", { ascending: false });

  const applicationRows = applications as ApplicationWithJob[] | null;

  // Compute stats
  const total = applicationRows?.length ?? 0;
  const pendingCount =
    applicationRows?.filter((a) => a.status === "PENDING").length ?? 0;
  const reviewedCount =
    applicationRows?.filter((a) => a.status === "REVIEWED").length ?? 0;
  const shortlistedCount =
    applicationRows?.filter((a) => a.status === "SHORTLISTED").length ?? 0;

  const stats: {
    label: string;
    value: number;
    icon: typeof Send;
    tone: Tone;
  }[] = [
    { label: "Total", value: total, icon: Send, tone: "indigo" },
    { label: "Pending", value: pendingCount, icon: Clock, tone: "amber" },
    { label: "Reviewed", value: reviewedCount, icon: Eye, tone: "sky" },
    {
      label: "Shortlisted",
      value: shortlistedCount,
      icon: Star,
      tone: "emerald",
    },
  ];

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-balance text-xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            My applications
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Every role you&apos;ve applied to, tracked in one place.
          </p>
        </div>
        <div className="w-full sm:w-auto sm:shrink-0">
          <Link href="/jobs" className="block w-full">
            <Button
              variant="secondary"
              iconRight={<ArrowRight className="h-4 w-4" />}
              className="w-full justify-center sm:w-auto"
            >
              Browse jobs
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Stats bar (only when there's data) ─── */}
      {total > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {stats.map((s) => {
            const tone = STAT_TONES[s.tone];
            return (
              <div
                key={s.label}
                className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br ${tone.bg} p-3 shadow-card sm:p-4`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-white shadow-sm sm:h-8 sm:w-8 sm:rounded-lg ${tone.icon}`}
                  >
                    <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <span
                    className={`truncate rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-gray-500 ring-1 sm:px-2 sm:text-[10px] ${tone.ring}`}
                  >
                    {s.label}
                  </span>
                </div>
                <p className="mt-2 text-xl font-bold tracking-tight text-gray-900 sm:mt-3 sm:text-2xl">
                  {s.value}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Applications list ─── */}
      {!applicationRows?.length ? (
        <div className="relative overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center shadow-card sm:rounded-2xl sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-100/30 blur-3xl" />

          <div className="relative flex flex-col items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 sm:h-16 sm:w-16 sm:rounded-2xl">
              <Inbox className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-gray-900 sm:text-xl">
                No applications yet
              </h2>
              <p className="mx-auto mt-1 max-w-[260px] text-balance text-xs text-gray-500 sm:mt-2 sm:max-w-sm sm:text-sm">
                When you apply to a role, it will show up here with its current
                status.
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
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {applicationRows.map((a) => {
            const job = a.jobs;
            return (
              <ApplicationCard
                key={a.id}
                jobTitle={job.title}
                companyName={job.companies.company_name}
                status={a.status}
                appliedAt={a.applied_at}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}