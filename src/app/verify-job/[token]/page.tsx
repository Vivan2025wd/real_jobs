import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
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
import { formatDate, timeAgo } from "@/lib/utils/format";

// Verification links must never be cached or indexed.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Verify job listing · HireLoop",
  robots: { index: false, follow: false },
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

// `users` is reached through `companies` — there is no direct FK from
// jobs → users. Two-level embeds collapse the row type to `never` in
// Supabase's select-string inference, so the email is fetched separately.
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
          icon={<CheckCircle2 className="h-7 w-7" />}
          eyebrow="Listing confirmed"
          title="Thanks — your listing is still active"
          description="We've re-verified this job. It will stay live on HireLoop for another 14 days before we check in again."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/dashboard/employer/jobs">
              <Button icon={<ArrowRight className="h-4 w-4" />}>
                Go to my jobs
              </Button>
            </Link>
            <Link href="/jobs">
              <Button variant="secondary">Browse jobs</Button>
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
          icon={<CheckCircle2 className="h-7 w-7" />}
          eyebrow="Listing archived"
          title="Listing marked as filled"
          description="Thanks for confirming. This role is now removed from the public job board, and job seekers can no longer apply."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/dashboard/employer/jobs/new">
              <Button>Post another job</Button>
            </Link>
            <Link href="/dashboard/employer">
              <Button variant="secondary">Back to dashboard</Button>
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
          icon={<AlertCircle className="h-7 w-7" />}
          eyebrow="Link expired"
          title="This link is no longer valid"
          description="The listing may have already been confirmed, or the verification window has closed. You can manage your jobs from the dashboard."
        >
          <Link href="/dashboard/employer/jobs">
            <Button>Go to my jobs</Button>
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
          icon={<AlertCircle className="h-7 w-7" />}
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
          icon={<AlertCircle className="h-7 w-7" />}
          eyebrow="Already used"
          title="Link already used or expired"
          description="This verification link has already been used, or the listing it referred to is no longer active. You can manage your jobs from the dashboard."
        >
          <Link href="/dashboard/employer/jobs">
            <Button>Go to my jobs</Button>
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
          icon={<Info className="h-7 w-7" />}
          eyebrow="Already resolved"
          title={`This listing is already ${job.status.toLowerCase()}`}
          description={`"${job.title}" at ${job.companies.company_name} has been marked as ${job.status.toLowerCase()}. No further action is needed.`}
        >
          <Link href="/dashboard/employer/jobs">
            <Button>Go to my jobs</Button>
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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
          <MessageSquare className="h-8 w-8" />
        </div>
        <p className="mt-5 text-sm font-medium text-indigo-600">
          {job.companies.company_name}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Is this role still open?
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-balance text-sm text-gray-600">
          Let us know if you&apos;re still hiring for{" "}
          <strong className="text-gray-900">{job.title}</strong>. This keeps the
          HireLoop job board accurate and saves job seekers from applying to
          filled roles.
        </p>
      </div>

      {/* ─── Job summary card ─── */}
      <dl className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-sm sm:p-5">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-gray-500">
            <Building2 className="h-3.5 w-3.5" />
            Company
          </dt>
          <dd className="mt-1 font-medium text-gray-900">
            {job.companies.company_name}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            Posted
          </dt>
          <dd className="mt-1 font-medium text-gray-900">
            {formatDate(job.created_at)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="flex items-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Last verified
          </dt>
          <dd className="mt-1 font-medium text-gray-900">
            {job.last_verified_at ? timeAgo(job.last_verified_at) : "Never"}
          </dd>
        </div>
      </dl>

      {/* ─── Window status banner ─── */}
      {isPastWindow ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-amber-900">
              Verification window closed
            </p>
            <p className="mt-0.5 text-sm text-amber-800">
              The 48-hour window has elapsed. If you take action below, your
              response will still be honoured — but the listing may have already
              been archived on the public board.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-indigo-900">
              {hoursRemaining} hour{hoursRemaining === 1 ? "" : "s"} remaining
            </p>
            <p className="mt-0.5 text-sm text-indigo-800">
              After the window closes, the listing is automatically archived.
            </p>
          </div>
        </div>
      )}

      {/* ─── Action buttons ─── */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <form action={confirmStillHiringAction} className="flex-1">
          <input type="hidden" name="token" value={params.token} />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            icon={<CheckCircle2 className="h-5 w-5" />}
          >
            Yes, still hiring
          </Button>
        </form>
        <form action={markAsFilledAction} className="flex-1">
          <input type="hidden" name="token" value={params.token} />
          <Button
            type="submit"
            size="lg"
            variant="secondary"
            className="w-full"
          >
            No, position filled
          </Button>
        </form>
      </div>

      {/* ─── Email footer ─── */}
      <div className="mt-6 flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5 text-xs text-gray-500">
        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
        <p>
          This verification was sent to{" "}
          <span className="font-medium text-gray-700">
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 px-4 py-12">
      {/* Background orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />

      <div
        className={`relative w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-gray-200 bg-white p-8 shadow-card sm:p-10`}
      >
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 transition hover:text-indigo-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs text-white shadow-sm">
              H
            </span>
            HireLoop
          </Link>
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
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${tones.bg} ${tones.text} shadow-sm ring-1 ${tones.ring}`}
      >
        {icon}
      </div>

      <p
        className={`mt-5 text-xs font-semibold uppercase tracking-wider ${tones.eyebrow}`}
      >
        {eyebrow}
      </p>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-balance text-sm text-gray-600">
        {description}
      </p>

      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}