import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowRight,
  Building2,
  Clock,
  Calendar,
  ShieldCheck,
  Mail,
  MessageSquare,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { formatDate, timeAgo } from "@/lib/utils/format";

// Verification links must never be cached or indexed.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Verify job listing · RealJobs",
  robots: { index: false, follow: false },
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

type JobForVerification = {
  id: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "FILLED" | "EXPIRED" | "ARCHIVED";
  last_verified_at: string | null;
  verification_sent_at: string | null;
  created_at: string;
  companies: {
    company_name: string;
    employer_id: string;
  };
};

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------
async function confirmStillHiringAction(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  if (!UUID_V4_RE.test(token)) {
    redirect(`/verify-job/${token}?result=invalid`);
  }

  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("jobs")
    .update({
      status: "ACTIVE",
      last_verified_at: new Date().toISOString(),
      verification_token: null,
      verification_sent_at: null,
    } as never)
    .eq("verification_token", token)
    .select("id")
    .returns<{ id: string }[]>();

  if (error || !updated?.length) {
    redirect(`/verify-job/${token}?result=invalid`);
  }

  redirect(`/verify-job/${token}?result=confirmed`);
}

async function markAsFilledAction(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  if (!UUID_V4_RE.test(token)) {
    redirect(`/verify-job/${token}?result=invalid`);
  }

  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("jobs")
    .update({
      status: "FILLED",
      verification_token: null,
      verification_sent_at: null,
    } as never)
    .eq("verification_token", token)
    .select("id")
    .returns<{ id: string }[]>();

  if (error || !updated?.length) {
    redirect(`/verify-job/${token}?result=invalid`);
  }

  redirect(`/verify-job/${token}?result=filled`);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function VerifyJobPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { result?: string };
}) {
  // ---- 1. Success states (no DB lookup — token is already consumed) ----
  if (searchParams.result === "confirmed") {
    return (
      <Shell>
        <ResultCard
          tone="success"
          icon={<CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7" />}
          eyebrow="Listing confirmed"
          title="Thanks — your listing is still active"
          description="We've re-verified this job. It will stay live on RealJobs for another 14 days before we check in again."
        >
          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
            <Link href="/dashboard/employer/jobs" className="w-full sm:w-auto">
              <Button icon={<ArrowRight className="h-4 w-4" />} className="w-full justify-center sm:w-auto">
                Go to my jobs
              </Button>
            </Link>
            <Link href="/jobs" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full justify-center sm:w-auto">Browse jobs</Button>
            </Link>
          </div>
        </ResultCard>
      </Shell>
    );
  }

  if (searchParams.result === "filled") {
    return (
      <Shell>
        <ResultCard
          tone="success"
          icon={<CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7" />}
          eyebrow="Listing archived"
          title="Listing marked as filled"
          description="Thanks for confirming. This role is now removed from the public job board, and job seekers can no longer apply."
        >
          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
            <Link href="/dashboard/employer/jobs/new" className="w-full sm:w-auto">
              <Button className="w-full justify-center sm:w-auto">Post another job</Button>
            </Link>
            <Link href="/dashboard/employer" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full justify-center sm:w-auto">Back to dashboard</Button>
            </Link>
          </div>
        </ResultCard>
      </Shell>
    );
  }

  if (searchParams.result === "invalid") {
    return (
      <Shell>
        <ResultCard
          tone="error"
          icon={<AlertCircle className="h-6 w-6 sm:h-7 sm:w-7" />}
          eyebrow="Link expired"
          title="This link is no longer valid"
          description="The listing may have already been confirmed, or the verification window has closed. You can manage your jobs from the dashboard."
        >
          <Link href="/dashboard/employer/jobs" className="w-full sm:w-auto">
            <Button className="w-full justify-center sm:w-auto">Go to my jobs</Button>
          </Link>
        </ResultCard>
      </Shell>
    );
  }

  // ---- 2. Reject malformed tokens before touching the DB ----
  if (!UUID_V4_RE.test(params.token)) {
    return (
      <Shell>
        <ResultCard
          tone="error"
          icon={<AlertCircle className="h-6 w-6 sm:h-7 sm:w-7" />}
          eyebrow="Invalid link"
          title="Invalid verification link"
          description="The link in your email appears to be malformed. Please check your inbox for the original message."
        />
      </Shell>
    );
  }

  // ---- 3. Look up the job by token (admin client — no auth required) ----
  const supabase = createAdminClient();

  const { data: jobResult } = await supabase
    .from("jobs")
    .select(
      "id, title, status, last_verified_at, verification_sent_at, created_at, companies!inner(company_name, employer_id)"
    )
    .eq("verification_token", params.token)
    .returns<JobForVerification>()
    .maybeSingle();

  const job = jobResult as unknown as JobForVerification | null;

  if (!job) {
    return (
      <Shell>
        <ResultCard
          tone="error"
          icon={<AlertCircle className="h-6 w-6 sm:h-7 sm:w-7" />}
          eyebrow="Already used"
          title="Link already used or expired"
          description="This verification link has already been used, or the listing it referred to is no longer active. You can manage your jobs from the dashboard."
        >
          <Link href="/dashboard/employer/jobs" className="w-full sm:w-auto">
            <Button className="w-full justify-center sm:w-auto">Go to my jobs</Button>
          </Link>
        </ResultCard>
      </Shell>
    );
  }

  // ---- 3b. Fetch the employer email in a second query ----
  const { data: employer } = await supabase
    .from("users")
    .select("email")
    .eq("id", job.companies.employer_id)
    .returns<{ email: string }>()
    .maybeSingle();

  const employerEmail = (employer as { email: string } | null)?.email ?? null;

  // ---- 4. Job is in a terminal state — nothing to verify ----
  if (job.status !== "ACTIVE") {
    return (
      <Shell>
        <ResultCard
          tone="info"
          icon={<Info className="h-6 w-6 sm:h-7 sm:w-7" />}
          eyebrow="Already resolved"
          title={`This listing is already ${job.status.toLowerCase()}`}
          description={`"${job.title}" at ${job.companies.company_name} has been marked as ${job.status.toLowerCase()}. No further action is needed.`}
        >
          <Link href="/dashboard/employer/jobs" className="w-full sm:w-auto">
            <Button className="w-full justify-center sm:w-auto">Go to my jobs</Button>
          </Link>
        </ResultCard>
      </Shell>
    );
  }

  // ---- 5. Normal verification flow ----
  const sentAt = job.verification_sent_at
    ? new Date(job.verification_sent_at).getTime()
    : Date.now();
  const isPastWindow = Date.now() - sentAt > FORTY_EIGHT_HOURS_MS;
  const hoursRemaining = Math.max(
    0,
    Math.floor((sentAt + FORTY_EIGHT_HOURS_MS - Date.now()) / 3_600_000)
  );

  return (
    <Shell wide>
      {/* ─── Hero ─── */}
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md sm:h-16 sm:w-16 sm:rounded-2xl">
          <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8" />
        </div>
        <p className="mt-3 text-xs font-medium text-indigo-600 sm:mt-5 sm:text-sm">
          {job.companies.company_name}
        </p>
        <h1 className="mt-1 text-balance text-xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Is this role still open?
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-balance text-xs text-gray-600 sm:mt-3 sm:text-sm">
          Let us know if you&apos;re still hiring for{" "}
          <strong className="text-gray-900">{job.title}</strong>. This keeps the
          RealJobs job board accurate and saves job seekers from applying to
          filled roles.
        </p>
      </div>

      {/* ─── Job summary card ─── */}
      <dl className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-xs sm:mt-8 sm:grid-cols-2 sm:gap-4 sm:p-5 sm:text-sm">
        <div>
          <dt className="flex items-center gap-1.5 text-[10px] text-gray-500 sm:text-xs">
            <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Company
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900 sm:mt-1 sm:text-base">
            {job.companies.company_name}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-[10px] text-gray-500 sm:text-xs">
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Posted
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900 sm:mt-1 sm:text-base">
            {formatDate(job.created_at)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="flex items-center gap-1.5 text-[10px] text-gray-500 sm:text-xs">
            <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Last verified
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900 sm:mt-1 sm:text-base">
            {job.last_verified_at ? timeAgo(job.last_verified_at) : "Never"}
          </dd>
        </div>
      </dl>

      {/* ─── Window status banner ─── */}
      {isPastWindow ? (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:mt-4 sm:gap-3 sm:px-4 sm:py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 sm:h-8 sm:w-8">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 sm:text-base">
              Verification window closed
            </p>
            <p className="mt-0.5 text-xs leading-snug text-amber-800 sm:text-sm">
              The 48-hour window has elapsed. If you take action below, your
              response will still be honoured — but the listing may have already
              been archived on the public board.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 p-3 sm:mt-4 sm:gap-3 sm:px-4 sm:py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 sm:h-8 sm:w-8">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-indigo-900 sm:text-base">
              {hoursRemaining} hour{hoursRemaining === 1 ? "" : "s"} remaining
            </p>
            <p className="mt-0.5 text-xs leading-snug text-indigo-800 sm:text-sm">
              After the window closes, the listing is automatically archived.
            </p>
          </div>
        </div>
      )}

      {/* ─── Action buttons ─── */}
      <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:gap-3">
        <form action={confirmStillHiringAction} className="w-full flex-1">
          <input type="hidden" name="token" value={params.token} />
          <Button
            type="submit"
            size="lg"
            className="w-full justify-center"
            icon={<CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />}
          >
            Yes, still hiring
          </Button>
        </form>
        <form action={markAsFilledAction} className="w-full flex-1">
          <input type="hidden" name="token" value={params.token} />
          <Button
            type="submit"
            size="lg"
            variant="secondary"
            className="w-full justify-center"
          >
            No, position filled
          </Button>
        </form>
      </div>

      {/* ─── Email footer ─── */}
      <div className="mt-5 flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2.5 text-[10px] text-gray-500 sm:mt-6 sm:px-3 sm:py-2.5 sm:text-xs">
        <Mail className="mt-0.5 h-3 w-3 shrink-0 text-gray-400 sm:h-3.5 sm:w-3.5" />
        <p className="min-w-0 leading-relaxed">
          This verification was sent to{" "}
          <span className="break-all font-medium text-gray-700">
            {employerEmail ?? "the registered employer"}
          </span>
          . If you believe you received this in error, simply ignore it — the
          listing will be archived automatically.
        </p>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Shared Shell
// ---------------------------------------------------------------------------
function Shell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 px-3 py-8 sm:px-4 sm:py-12">
      {/* Background orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />

      <div
        className={`relative w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-xl border border-gray-200 bg-white p-5 shadow-card sm:rounded-2xl sm:p-10`}
      >
        {/* Brand mark */}
        <div className="mb-5 text-center sm:mb-8">
          <Logo size="sm" />
        </div>

        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultCard — shared layout for all terminal states
// ---------------------------------------------------------------------------
function ResultCard({
  tone,
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  tone: "success" | "error" | "info";
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const tones = {
    success: {
      ring: "ring-emerald-200",
      bg: "from-emerald-100 to-teal-100",
      text: "text-emerald-700",
      eyebrow: "text-emerald-600",
    },
    error: {
      ring: "ring-rose-200",
      bg: "from-rose-100 to-red-100",
      text: "text-rose-700",
      eyebrow: "text-rose-600",
    },
    info: {
      ring: "ring-indigo-200",
      bg: "from-indigo-100 to-violet-100",
      text: "text-indigo-700",
      eyebrow: "text-indigo-600",
    },
  }[tone];

  return (
    <div className="text-center">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tones.bg} ${tones.text} shadow-sm ring-1 ${tones.ring} sm:h-16 sm:w-16 sm:rounded-2xl`}
      >
        {icon}
      </div>

      <p
        className={`mt-3 text-[10px] font-semibold uppercase tracking-wider sm:mt-5 sm:text-xs ${tones.eyebrow}`}
      >
        {eyebrow}
      </p>
      <h1 className="mt-1 text-balance text-lg font-bold tracking-tight text-gray-900 sm:mt-1.5 sm:text-2xl">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-balance text-xs text-gray-600 sm:mt-3 sm:text-sm">
        {description}
      </p>

      {children && <div className="mt-5 sm:mt-8">{children}</div>}
    </div>
  );
}