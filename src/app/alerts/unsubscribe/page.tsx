import { createAdminClient } from "@/lib/supabase/admin";

type SearchParams = {
  token?: string;
  result?: string;
};

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  let state: "confirm" | "invalid" | "success" | "already" | "error" =
    "invalid";
  let token: string | null = null;

  if (searchParams.result === "success") {
    state = "success";
  } else if (searchParams.result === "error") {
    state = "error";
  } else if (searchParams.token && /^[a-f0-9]{48}$/i.test(searchParams.token)) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("saved_searches")
      .select("alert_frequency")
      .eq("unsubscribe_token", searchParams.token)
      .maybeSingle();
    if (error) throw new Error(`Failed to verify unsubscribe link: ${error.message}`);
    if (data) {
      state = data.alert_frequency === "NONE" ? "already" : "confirm";
      token = searchParams.token;
    }
  }

  const messages = {
    confirm: {
      title: "Turn off this job alert?",
      body: "Confirm below to stop email alerts for this saved search.",
    },
    invalid: {
      title: "This link is invalid",
      body: "This unsubscribe link is missing or no longer valid.",
    },
    success: {
      title: "You’re unsubscribed",
      body: "Email alerts for this saved search have been turned off.",
    },
    already: {
      title: "Alerts are already off",
      body: "This saved search will no longer send you email alerts.",
    },
    error: {
      title: "We couldn’t update your preferences",
      body: "Please try again later or manage your alerts from your account.",
    },
  }[state];

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-card sm:p-8">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          {messages.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">{messages.body}</p>
        {state === "confirm" && token && (
          <form
            action={`/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`}
            method="post"
            className="mt-6"
          >
            <button
              type="submit"
              className="min-h-11 w-full rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Unsubscribe from this alert
            </button>
          </form>
        )}
        {state === "error" && (
          <a
            href="/dashboard/seeker"
            className="mt-5 inline-flex min-h-10 items-center text-sm font-semibold text-indigo-700 hover:text-indigo-800"
          >
            Manage saved searches
          </a>
        )}
      </section>
    </main>
  );
}
