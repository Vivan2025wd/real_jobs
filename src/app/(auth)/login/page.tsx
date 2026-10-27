// src/app/(auth)/login/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/ui/SubmitButton";

type SearchParams = {
  error?: string;
  message?: string;
  next?: string;
};

async function signInWithPassword(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    redirect(
      "/login?error=" + encodeURIComponent("Email and password are required.")
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  const role = (data.user.user_metadata?.role ?? "JOB_SEEKER").toUpperCase();
  const defaultDashboard =
    role === "EMPLOYER" ? "/dashboard/employer" : "/dashboard/seeker";
  const target =
    next.startsWith("/") && !next.startsWith("//") ? next : defaultDashboard;

  revalidatePath("/", "layout");
  redirect(target);
}

async function signInWithMagicLink(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/login?error=" + encodeURIComponent("Email is required."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
    },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect(
    "/login?message=" +
      encodeURIComponent("Check your inbox for the sign-in link.")
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, message, next } = searchParams;

  return (
    <div className="flex min-h-screen bg-white">
      {/* ─── Left: brand panel ─── */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gray-950 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-700 to-indigo-900 opacity-90" />
        <div className="absolute inset-0 bg-grid opacity-20" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm backdrop-blur">
              H
            </span>
            <span className="tracking-tight">HireLoop</span>
          </Link>

          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome back
            </div>

            <h2 className="mt-6 text-balance text-4xl font-bold leading-tight tracking-tighter text-white">
              Pick up where you left off.
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-indigo-100/90">
              Your applications, saved roles, and verification status are right
              where you left them.
            </p>

            <ul className="mt-10 space-y-4">
              {[
                {
                  icon: CheckCircle2,
                  text: "Every listing verified weekly",
                },
                {
                  icon: ShieldCheck,
                  text: "Bank-grade encrypted resume storage",
                },
                {
                  icon: Zap,
                  text: "One-click apply from your profile",
                },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm text-white">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
                    <f.icon className="h-4 w-4" />
                  </div>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-indigo-200/70">
            © {new Date().getFullYear()} HireLoop · Built with Next.js
          </p>
        </div>
      </div>

      {/* ─── Right: form panel ─── */}
      <div className="flex w-full items-center justify-center bg-white px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2 font-bold lg:hidden"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm text-white shadow-sm">
              H
            </span>
            <span className="tracking-tight text-gray-900">HireLoop</span>
          </Link>

          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-gray-900">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to continue to your dashboard.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {/* Password sign-in */}
          <form action={signInWithPassword} className="mt-8 space-y-5">
            {next && <input type="hidden" name="next" value={next} />}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 uppercase tracking-wider text-gray-400">
                or
              </span>
            </div>
          </div>

          {/* Magic link */}
          <form action={signInWithMagicLink} className="space-y-3">
            <div>
              <label
                htmlFor="magic-email"
                className="block text-sm font-medium text-gray-700"
              >
                Email me a sign-in link
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-gray-400" />
                <input
                  id="magic-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
            <SubmitButton pendingText="Sending…" variant="secondary">
              Send magic link
            </SubmitButton>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700"
            >
              Create one
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}