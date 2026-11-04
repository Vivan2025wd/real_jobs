import Link from "next/link";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";

const TOKEN_RE = /^[A-Za-z0-9_-]{40,60}$/;

async function handleExternalJobDecision(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!TOKEN_RE.test(token) || (action !== "still-hiring" && action !== "filled")) {
    redirect(`/external-job/${token || "invalid"}?result=invalid`);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const adminDb = createAdminClient();
  const { data: consumedAction, error: consumeError } = await adminDb.rpc(
    "consume_milestone_action",
    { p_token_hash: tokenHash, p_action: action }
  );
  if (consumeError || consumedAction !== action) {
    console.error("[external-job] milestone action failed:", consumeError);
    redirect(`/external-job/${token}?result=invalid`);
  }

  redirect(`/external-job/${token}?result=${action === "still-hiring" ? "confirmed" : "filled"}`);
}

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ExternalJobResponsePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { action?: string; result?: string };
}) {
  const token = params.token;
  if (!TOKEN_RE.test(token)) {
    return <ErrorState title="Invalid link" description="This response link is invalid or expired." />;
  }

  if (searchParams.result === "confirmed") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900">Thanks — your listing is still active</h1>
        <p className="mt-3 text-sm text-gray-600">
          We&apos;ve updated the verification date only. This does not extend the listing&apos;s scheduled expiry.
        </p>
        <div className="mt-6">
          <Link href="/dashboard/employer/jobs" className="inline-block">
            <Button className="justify-center">Go to my jobs</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (searchParams.result === "filled") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900">Listing marked as filled</h1>
        <p className="mt-3 text-sm text-gray-600">
          Thanks for confirming. This listing has been closed to new applications.
        </p>
        <div className="mt-6">
          <Link href="/dashboard/employer/jobs" className="inline-block">
            <Button className="justify-center">Go to my jobs</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (searchParams.result === "invalid") {
    return (
      <ErrorState
        title="This response link is no longer valid"
        description="It may have expired, already been used, or the listing is no longer active."
      />
    );
  }

  const adminDb = createAdminClient();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: contact, error: contactError } = await adminDb
    .from("job_external_contacts")
    .select("job_id, milestone_token_expires_at")
    .eq("milestone_token_hash", tokenHash)
    .gt("milestone_token_expires_at", new Date().toISOString())
    .maybeSingle();

  if (contactError || !contact) {
    return <ErrorState title="This response link is no longer valid" description="It may have expired or already been used." />;
  }

  const { data: job, error: jobError } = await adminDb
    .from("jobs")
    .select("id, title, source, status, claimed_at")
    .eq("id", contact.job_id)
    .maybeSingle();

  if (jobError || !job || job.source !== "EXTERNAL" || job.claimed_at || job.status !== "ACTIVE") {
    return <ErrorState title="This listing is no longer active" description="The sourced listing has moved on or been claimed by an employer." />;
  }

  if (searchParams.action !== "still-hiring" && searchParams.action !== "filled") {
    return <ErrorState title="Invalid response action" description="This response link is invalid or expired." />;
  }

  const isStillHiring = searchParams.action === "still-hiring";
  const actionLabel = isStillHiring ? "still hiring" : "position filled";

  return (
    <Shell>
      <p className="text-sm font-medium text-indigo-600">RealJobs.lk listing update</p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Confirm: {actionLabel}</h1>
      <p className="mt-3 text-sm text-gray-600">
        This will update the public listing for <strong>{job.title}</strong> without exposing applicant names or CVs.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <form action={handleExternalJobDecision} className="flex-1">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="action" value={isStillHiring ? "still-hiring" : "filled"} />
          <Button type="submit" className="w-full justify-center">
            {isStillHiring ? "Yes, still hiring" : "Mark as filled"}
          </Button>
        </form>
        <Link href="/" className="flex-1">
          <Button type="button" variant="secondary" className="w-full justify-center">
            Cancel
          </Button>
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        {children}
      </section>
    </main>
  );
}

function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <Shell>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-3 text-sm text-gray-600">{description}</p>
      <div className="mt-6">
        <Link href="/" className="inline-block">
          <Button className="justify-center">Return to RealJobs</Button>
        </Link>
      </div>
    </Shell>
  );
}
