import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
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
//
// Both actions use the admin (service-role) client — the token itself is the
// authority, not an authenticated user. The token is cleared on success so
// the link can only be used once.
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
      <Shell centered>
        <IconCircle kind="success">✓</IconCircle>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Thanks — your listing is still active
        </h1>
        <p className="mt-2 text-gray-600">
          We&apos;ve re-verified this job. It will stay live on HireLoop for
          another 14 days before we check in again.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/dashboard/employer/jobs">
            <Button>Go to my jobs</Button>
          </Link>
          <Link href="/jobs">
            <Button variant="secondary">Browse jobs</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (searchParams.result === "filled") {
    return (
      <Shell centered>
        <IconCircle kind="success">✓</IconCircle>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Listing marked as filled
        </h1>
        <p className="mt-2 text-gray-600">
          Thanks for confirming. This role is now removed from the public job
          board, and job seekers can no longer apply.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/dashboard/employer/jobs/new">
            <Button>Post another job</Button>
          </Link>
          <Link href="/dashboard/employer">
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (searchParams.result === "invalid") {
    return (
      <Shell centered>
        <IconCircle kind="error">!</IconCircle>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          This link is no longer valid
        </h1>
        <p className="mt-2 text-gray-600">
          The listing may have already been confirmed, or the verification
          window has closed. You can manage your jobs from the dashboard.
        </p>
        <div className="mt-8">
          <Link href="/dashboard/employer/jobs">
            <Button>Go to my jobs</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // ---- 2. Reject malformed tokens before touching the DB ----
  if (!UUID_V4_RE.test(params.token)) {
    return (
      <Shell centered>
        <IconCircle kind="error">!</IconCircle>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Invalid verification link
        </h1>
        <p className="mt-2 text-gray-600">
          The link in your email appears to be malformed. Please check your
          inbox for the original message.
        </p>
      </Shell>
    );
  }

  // ---- 3. Look up the job by token (admin client — no auth required) ----
  // Single-level embed only. PostgREST + Supabase's type inference handle
  // `companies!inner(...)` reliably; two-level embeds (companies.users)
  // produce `never` and defeat `.returns<T>()`.
  const supabase = createAdminClient();

  const { data: jobResult } = await supabase
    .from("jobs")
    .select(
      "id, title, status, last_verified_at, verification_sent_at, created_at, companies!inner(company_name, employer_id)"
    )
    .eq("verification_token", params.token)
    .returns<JobForVerification>()
    .maybeSingle();

  // The generated query type can still resolve the embedded row to `never`.
  const job = jobResult as unknown as JobForVerification | null;

  if (!job) {
    return (
      <Shell centered>
        <IconCircle kind="error">!</IconCircle>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Link already used or expired
        </h1>
        <p className="mt-2 text-gray-600">
          This verification link has already been used, or the listing it
          referred to is no longer active. You can manage your jobs from the
          dashboard.
        </p>
        <div className="mt-8">
          <Link href="/dashboard/employer/jobs">
            <Button>Go to my jobs</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // ---- 3b. Fetch the employer email in a second query ----
  // A single-table query on `users` avoids the two-level embed issue
  // entirely and types cleanly against the generated schema.
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
      <Shell centered>
        <IconCircle kind="info">i</IconCircle>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          This listing is already {job.status.toLowerCase()}
        </h1>
        <p className="mt-2 text-gray-600">
          &ldquo;{job.title}&rdquo; at {job.companies.company_name} has been
          marked as {job.status.toLowerCase()}. No further action is needed.
        </p>
        <div className="mt-8">
          <Link href="/dashboard/employer/jobs">
            <Button>Go to my jobs</Button>
          </Link>
        </div>
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
      <div className="text-center">
        <p className="text-sm font-medium text-blue-600">
          {job.companies.company_name}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Is this role still open?
        </h1>
        <p className="mt-2 text-gray-600">
          Let us know if you&apos;re still hiring for{" "}
          <strong>{job.title}</strong>. This keeps the HireLoop job board
          accurate and saves job seekers from applying to filled roles.
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
        <div>
          <dt className="text-gray-500">Job title</dt>
          <dd className="mt-0.5 font-medium text-gray-900">{job.title}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Company</dt>
          <dd className="mt-0.5 font-medium text-gray-900">
            {job.companies.company_name}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Posted</dt>
          <dd className="mt-0.5 font-medium text-gray-900">
            {formatDate(job.created_at)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Last verified</dt>
          <dd className="mt-0.5 font-medium text-gray-900">
            {job.last_verified_at ? timeAgo(job.last_verified_at) : "Never"}
          </dd>
        </div>
      </dl>

      {isPastWindow ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The 48-hour verification window has closed. If you take action below,
          your response will still be honoured — but the listing may have
          already been archived on the public board.
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          You have about{" "}
          <strong>
            {hoursRemaining} hour{hoursRemaining === 1 ? "" : "s"}
          </strong>{" "}
          to respond. After that, the listing is automatically archived.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <form action={confirmStillHiringAction} className="flex-1">
          <input type="hidden" name="token" value={params.token} />
          <Button type="submit" className="w-full">
            Yes, still hiring
          </Button>
        </form>
        <form action={markAsFilledAction} className="flex-1">
          <input type="hidden" name="token" value={params.token} />
          <Button type="submit" variant="secondary" className="w-full">
            No, position filled
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-gray-500">
        This verification was sent to{" "}
        <span className="font-medium text-gray-700">
          {employerEmail ?? "the registered employer"}
        </span>
        . If you believe you received this in error, simply ignore it — the
        listing will be archived automatically.
      </p>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Shared layout + icons
// ---------------------------------------------------------------------------
function Shell({
  children,
  wide = false,
  centered = false,
}: {
  children: ReactNode;
  wide?: boolean;
  centered?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-12">
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-gray-200 bg-white p-8 shadow-sm`}
      >
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-900"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs text-white">
              H
            </span>
            HireLoop
          </Link>
        </div>
        <div className={centered ? "text-center" : ""}>{children}</div>
      </div>
    </div>
  );
}

function IconCircle({
  kind,
  children,
}: {
  kind: "success" | "error" | "info";
  children: ReactNode;
}) {
  const styles = {
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
  }[kind];

  return (
    <div
      className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xl font-semibold ${styles}`}
    >
      {children}
    </div>
  );
}