import Link from "next/link";
import { createHash } from "node:crypto";
import { claimJob } from "@/app/actions/claim-job";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/redirect";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { error?: string };
}) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(params.token)) return <ClaimError />;

  const nextPath = safeNextPath(`/claim/${params.token}`);
  const adminDb = createAdminClient();
  const tokenHash = createHash("sha256").update(params.token).digest("hex");
  const { data: contact, error: contactError } = await adminDb
    .from("job_external_contacts")
    .select("job_id, claim_token_expires_at")
    .eq("claim_token_hash", tokenHash)
    .gt("claim_token_expires_at", new Date().toISOString())
    .maybeSingle();

  if (contactError) {
    console.error("[claim page] token lookup failed:", contactError);
    return <ClaimError />;
  }
  if (!contact) return <ClaimError />;

  const { data: job, error: jobError } = await adminDb
    .from("jobs")
    .select("id, title, source, claimed_at, status")
    .eq("id", contact.job_id)
    .maybeSingle();
  if (jobError) {
    console.error("[claim page] job lookup failed:", jobError);
    return <ClaimError />;
  }
  if (!job || job.source !== "EXTERNAL" || job.claimed_at || job.status !== "ACTIVE") {
    return <ClaimError />;
  }

  const { count, error: countError } = await adminDb
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job.id)
    .neq("status", "WITHDRAWN");
  if (countError) {
    console.error("[claim page] applicant count failed:", countError);
    return <ClaimError />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile, error: profileError } = user
    ? await supabase.from("users").select("role").eq("id", user.id).maybeSingle()
    : { data: null, error: null };
  const typedProfile = profile as unknown as { role: string } | null;
  if (profileError) console.error("[claim page] user role lookup failed:", profileError);
  const employer = typedProfile?.role === "EMPLOYER";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-indigo-600">RealJobs.lk listing claim</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{job.title}</h1>
        <p className="mt-3 text-gray-600">
          There are <strong>{count ?? 0}</strong> applicant{count === 1 ? "" : "s"} for this listing.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Claim this listing to verify it and review applicants. Applicant CVs and details have not been emailed.
        </p>

        {searchParams.error && (
          <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
            {searchParams.error}
          </p>
        )}

        {employer ? (
          <form action={claimJob} className="mt-6">
            <input type="hidden" name="token" value={params.token} />
            <button
              type="submit"
              className="min-h-11 w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700"
            >
              Claim this listing
            </button>
          </form>
        ) : user ? (
          <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Sign in with an employer account to claim this listing.
          </p>
        ) : (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              className="rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Employer sign in
            </Link>
            <Link
              href={`/register?role=EMPLOYER&next=${encodeURIComponent(nextPath)}`}
              className="rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Create employer account
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function ClaimError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-xl font-bold text-gray-900">This claim link is unavailable</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          The link may have expired, already been used, or the listing may no longer be active.
        </p>
        <Link href="/" className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Return to RealJobs
        </Link>
      </section>
    </main>
  );
}
