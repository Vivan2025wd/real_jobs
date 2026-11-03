import Link from "next/link";
import { createHash } from "node:crypto";
import { confirmEmailUnsubscribe } from "@/app/actions/email-unsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function UnsubscribePage({
  params,
}: {
  params: { token: string };
}) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(params.token)) return <UnsubscribeUnavailable />;

  const tokenHash = createHash("sha256").update(params.token).digest("hex");
  const adminDb = createAdminClient();
  const { data: token, error } = await adminDb
    .from("email_unsubscribe_tokens")
    .select("token_hash")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error("[unsubscribe page] token lookup failed:", error);
    return <UnsubscribeUnavailable />;
  }
  if (!token) return <UnsubscribeUnavailable />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-xl font-bold text-gray-900">Stop listing invitations?</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Confirm below and we will add this address to our suppression list. This request is not processed until you confirm.
        </p>
        <form action={confirmEmailUnsubscribe} className="mt-6">
          <input type="hidden" name="token" value={params.token} />
          <button type="submit" className="min-h-11 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700">
            Don&apos;t contact me again
          </button>
        </form>
      </section>
    </main>
  );
}

function UnsubscribeUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-xl font-bold text-gray-900">This link is unavailable</h1>
        <p className="mt-2 text-sm text-gray-600">The link may have expired or already been used.</p>
        <Link href="/" className="mt-5 inline-block text-sm font-medium text-indigo-600">Return to RealJobs</Link>
      </section>
    </main>
  );
}
