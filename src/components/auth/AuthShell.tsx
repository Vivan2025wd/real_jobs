// src/components/auth/AuthShell.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const BENEFITS = [
  "Listings auto-expire after 7, 14, or 30 days",
  "Mid-life verification on 30-day postings",
  "Zero ghost listings guaranteed",
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ═══ Left: brand panel (desktop only) ═══ */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-12 lg:flex lg:flex-col lg:justify-between">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />

        {/* Brand mark — translucent variant for the dark panel */}
        <Link
          href="/"
          className="relative inline-flex items-center gap-2.5 text-white transition hover:opacity-90"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-sm font-bold backdrop-blur-sm">
            R
          </span>
          <span className="text-lg font-bold tracking-tight">RealJobs</span>
        </Link>

        {/* Middle content */}
        <div className="relative max-w-md">
          <h1 className="text-balance text-4xl font-bold leading-tight text-white">
            Job listings that stay actually open.
          </h1>
          <p className="mt-4 text-balance text-lg leading-relaxed text-white/80">
            Every listing on RealJobs has a fixed lifespan — 7, 14, or 30
            days. When it ends, the job archives itself. No stale posts. No
            dead applications.
          </p>

          <ul className="mt-8 space-y-3">
            {BENEFITS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-white/90"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} RealJobs. All rights reserved.
        </p>
      </div>

      {/* ═══ Right: form panel ═══ */}
      <div className="flex flex-col bg-white">
        {/* Mobile brand bar */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 sm:px-6 lg:hidden">
          <Logo size="sm" />
        </div>

        {/* Centered content */}
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}