// src/components/auth/AuthShell.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

const BENEFITS = [
  "Automated 14-day re-verification",
  "Auto-archive if employer doesn't respond",
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

        {/* Brand mark */}
        <Link
          href="/"
          className="relative inline-flex items-center gap-2.5 text-white transition hover:opacity-90"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-sm font-bold backdrop-blur-sm">
            H
          </span>
          <span className="text-lg font-bold tracking-tight">HireLoop</span>
        </Link>

        {/* Middle content */}
        <div className="relative max-w-md">
          <h1 className="text-balance text-4xl font-bold leading-tight text-white">
            Job listings that stay actually open.
          </h1>
          <p className="mt-4 text-balance text-lg leading-relaxed text-white/80">
            Every listing on HireLoop is verified weekly. No stale posts. No
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
          © {new Date().getFullYear()} HireLoop. All rights reserved.
        </p>
      </div>

      {/* ═══ Right: form panel ═══ */}
      <div className="flex flex-col bg-white">
        {/* Mobile brand bar */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
              H
            </span>
            <span className="text-sm font-bold tracking-tight text-gray-900">
              HireLoop
            </span>
          </Link>
        </div>

        {/* Centered content */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}