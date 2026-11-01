import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Users,
  Sparkles,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/Logo";
import { Navbar } from "@/components/layout/Navbar";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Live stats
  const [{ count: activeJobs }, { count: totalCompanies }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE"),
    supabase.from("companies").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white">
      {/* ─── Navbar ─── */}
      <Navbar initialUser={user} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-mesh">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative mx-auto w-full max-w-4xl px-4 py-12 text-center sm:py-20 lg:py-28">
          <div className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-indigo-700 shadow-sm backdrop-blur sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 sm:h-2 sm:w-2" />
            </span>
            Auto-expiring · No stale listings
          </div>

          <h1 className="animate-fade-up animation-delay-100 mt-5 text-balance text-3xl font-bold tracking-tight text-gray-900 sm:mt-6 sm:text-5xl lg:text-6xl">
            Job listings that{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
              stay actually open
            </span>
          </h1>

          <p className="animate-fade-up animation-delay-200 mx-auto mt-4 max-w-2xl text-balance text-sm leading-relaxed text-gray-600 sm:mt-6 sm:text-lg">
            Every listing on RealJobs has a lifespan — 7, 14, or 30 days. When
            it ends, the job archives itself. We also re-verify with the
            employer halfway through. You never apply to a ghost posting again.
          </p>

          <div className="animate-fade-up animation-delay-300 mt-6 flex flex-col items-center justify-center gap-2.5 sm:mt-10 sm:flex-row sm:gap-3">
            <Link
              href="/jobs"
              className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-xl sm:h-12 sm:w-auto sm:px-7"
            >
              Browse open roles
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/register?role=EMPLOYER"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md sm:h-12 sm:w-auto sm:px-7"
            >
              Post a job
            </Link>
          </div>

          <div className="animate-fade-up animation-delay-300 mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-500 sm:mt-12 sm:gap-x-8 sm:gap-y-3 sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 sm:h-4 sm:w-4" />
              <span>
                <strong className="text-gray-900">{activeJobs ?? 0}</strong>{" "}
                active jobs
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 sm:h-4 sm:w-4" />
              <span>
                <strong className="text-gray-900">{totalCompanies ?? 0}</strong>{" "}
                companies
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 sm:h-4 sm:w-4" />
              <span>Auto-expiring</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="border-t border-gray-100 bg-white py-12 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 sm:text-sm">
              Built different
            </p>
            <h2 className="mt-1.5 text-balance text-xl font-bold tracking-tight text-gray-900 sm:mt-2 sm:text-3xl lg:text-4xl">
              Every listing verified. Every application real.
            </h2>
            <p className="mt-3 text-balance text-sm text-gray-600 sm:mt-4 sm:text-base">
              Traditional job boards let stale postings rot for months. We
              built the platform that fixes it.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:mt-14 sm:grid-cols-3 sm:gap-6">
            {[
              {
                icon: Clock,
                title: "Automated lifecycle",
                body: "Every listing has a lifespan — 7, 14, or 30 days. When it ends, the job archives itself. We re-verify with the employer halfway through.",
                tone: "from-indigo-500 to-violet-600",
              },
              {
                icon: Users,
                title: "Dual-sided dashboards",
                body: "Employers manage postings, applications, and payments in one place. Seekers track every application in real time.",
                tone: "from-emerald-500 to-teal-600",
              },
              {
                icon: ShieldCheck,
                title: "Secure direct uploads",
                body: "Resumes upload straight to encrypted cloud storage via pre-signed URLs — nothing heavy passes through our servers.",
                tone: "from-amber-500 to-orange-600",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-card transition-all hover:-translate-y-1 hover:border-gray-300 hover:shadow-card-hover sm:rounded-2xl sm:p-6"
              >
                <div
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${f.tone} text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-xl`}
                >
                  <f.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <h3 className="mt-3 text-base font-semibold tracking-tight text-gray-900 sm:mt-4 sm:text-lg">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600 sm:mt-2 sm:text-sm">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="border-t border-gray-100 bg-gray-50 py-12 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-4xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 sm:text-sm">
              How it works
            </p>
            <h2 className="mt-1.5 text-balance text-xl font-bold tracking-tight text-gray-900 sm:mt-2 sm:text-3xl lg:text-4xl">
              Three steps. Zero guesswork.
            </h2>
          </div>

          <div className="mt-8 grid gap-5 sm:mt-14 sm:grid-cols-3 sm:gap-6">
            {[
              {
                n: "01",
                title: "Find a role",
                body: "Filter by category, salary, or location. Every listing you see is active right now.",
              },
              {
                n: "02",
                title: "Apply with one click",
                body: "Your resume stays on file. Apply to any matching role without re-uploading.",
              },
              {
                n: "03",
                title: "Track the response",
                body: "See when your application is reviewed, shortlisted, or rejected. No more black holes.",
              },
            ].map((s) => (
              <div key={s.n} className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-white text-xs font-bold text-indigo-600 shadow-sm sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm">
                  {s.n}
                </div>
                <h3 className="mt-3 text-base font-semibold tracking-tight text-gray-900 sm:mt-4 sm:text-lg">
                  {s.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-600 sm:mt-2 sm:text-sm">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative overflow-hidden bg-gray-900 py-12 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative mx-auto w-full max-w-3xl px-4 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-indigo-400 sm:h-10 sm:w-10" />
          <h2 className="mt-4 text-balance text-xl font-bold tracking-tight text-white sm:mt-6 sm:text-3xl lg:text-4xl">
            Stop applying to dead job posts.
          </h2>
          <p className="mt-2 text-balance text-sm text-gray-300 sm:mt-4 sm:text-lg">
            Join the marketplace where every listing is guaranteed to be
            current.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:mt-10 sm:flex-row sm:gap-3">
            <Link
              href="/register"
              className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-gray-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-50 sm:h-12 sm:w-auto sm:px-7"
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/jobs"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10 sm:h-12 sm:w-auto sm:px-7"
            >
              Browse jobs
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-gray-500 sm:flex-row sm:py-10 sm:text-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Logo size="sm" withText={false} />
            <span>© {new Date().getFullYear()} RealJobs</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:gap-x-6">
            <Link href="/jobs" className="transition hover:text-gray-900">
              Browse jobs
            </Link>
            <Link
              href="/register?role=EMPLOYER"
              className="transition hover:text-gray-900"
            >
              For employers
            </Link>
            <Link href="/login" className="transition hover:text-gray-900">
              Sign in
            </Link>
          </nav>
          <p className="text-[10px] text-gray-400 sm:text-xs">
            Built with Next.js · Supabase · AWS
          </p>
        </div>
      </footer>
    </div>
  );
}