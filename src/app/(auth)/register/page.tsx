import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel — hidden on mobile */}
      <div className="relative hidden overflow-hidden bg-gray-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        {/* Logo */}
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-base font-bold backdrop-blur">
              H
            </span>
            <span className="text-lg font-bold tracking-tight">HireLoop</span>
          </Link>
        </div>

        {/* Value prop */}
        <div className="relative max-w-md space-y-8">
          <h2 className="text-balance text-4xl font-bold leading-tight tracking-tight text-white">
            The job board that stays{" "}
            <span className="text-emerald-300">actually open</span>.
          </h2>
          <p className="text-lg leading-relaxed text-indigo-100/90">
            Every listing re-verified weekly. No ghost postings. No stale
            applications.
          </p>
          <ul className="space-y-3 text-white">
            {[
              "Automatic 14-day verification",
              "One-click applications with resume on file",
              "Real-time application status tracking",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <span className="text-indigo-50">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial */}
        <div className="relative">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm italic text-white/90">
              &ldquo;Finally, a job board where every listing is real. I applied
              to 5 roles and heard back from 4.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
                KS
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Kasun Silva</p>
                <p className="text-xs text-white/70">Software Engineer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex flex-col bg-white">
        <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <Link
              href="/"
              className="mb-8 flex items-center justify-center gap-2.5 lg:hidden"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white shadow-sm">
                H
              </span>
              <span className="text-lg font-bold tracking-tight text-gray-900">
                HireLoop
              </span>
            </Link>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}