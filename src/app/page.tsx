// src/app/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = (user?.user_metadata?.role ?? "").toUpperCase();
  const dashboardHref =
    role === "EMPLOYER" ? "/dashboard/employer" : "/dashboard/seeker";

  return (
    <div className="flex min-h-screen flex-col">
      {/* ---- Nav ---- */}
      <header className="border-b border-gray-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              H
            </span>
            HireLoop
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/jobs"
              className="text-gray-600 hover:text-gray-900"
            >
              Browse jobs
            </Link>
            {user ? (
              <Link
                href={dashboardHref}
                className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center">
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Verified weekly · No stale listings
        </span>
        <h1 className="mt-6 text-balance text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Job listings that stay{" "}
          <span className="text-blue-600">actually open</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-gray-600">
          HireLoop automatically re-verifies every listing with the employer
          every 14 days. If they don&apos;t respond, the job is archived.. You never
          apply to a ghost posting again.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/jobs"
            className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Browse open roles
          </Link>
          <Link
            href="/register?role=EMPLOYER"
            className="rounded-md border border-gray-300 bg-white px-6 py-3 font-medium text-gray-900 hover:bg-gray-50"
          >
            Post a job
          </Link>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section className="border-t border-gray-200 bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Built different
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Automated lifecycle",
                body: "Every active job is re-verified weekly. Employers confirm with one click, or the listing auto-expires in 48 hours.",
              },
              {
                title: "Dual-sided dashboards",
                body: "Employers manage postings, applications, and payments in one place. Seekers track every application in real time.",
              },
              {
                title: "Secure, direct uploads",
                body: "Resumes upload straight to encrypted cloud storage via pre-signed URLs — nothing heavy passes through our servers.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="mt-auto border-t border-gray-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-gray-500 sm:flex-row">
          <p>© {new Date().getFullYear()} HireLoop</p>
          <p>Built with Next.js, Supabase, and AWS</p>
        </div>
      </footer>
    </div>
  );
}