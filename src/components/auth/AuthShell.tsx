// src/components/auth/AuthShell.tsx
import Link from "next/link";
import Image from "next/image";
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
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* ═══ Left: brand panel (desktop only) ═══ */}
      {/* මේක මොබයිල් එකේදී හැංගිලා තියෙන නිසා, ඩෙස්ක්ටොප් එකට විතරක් ගැලපෙන විදියට තියමු */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-12 lg:flex lg:flex-col lg:justify-between">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />

        {/* Brand mark — translucent variant for the dark panel */}
        <Link
          href="/"
          className="relative inline-flex items-center gap-2.5 text-white transition hover:opacity-90"
        >
          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
            <Image
              src="/logo.jpg"
              alt="RealJobs Logo"
              width={40}
              height={40}
              className="object-contain scale-[1.0]" 
            />
          </span>
          <span className="text-xl font-bold tracking-tight">RealJobs</span>
        </Link>

        {/* Middle content */}
        <div className="relative max-w-md">
          <h1 className="text-balance text-3xl font-bold leading-tight text-white lg:text-4xl">
            Job listings that stay actually open.
          </h1>
          <p className="mt-4 text-balance text-base leading-relaxed text-white/80 lg:text-lg">
            Every listing on RealJobs has a fixed lifespan — 7, 14, or 30
            days. When it ends, the job archives itself. No stale posts. No
            dead applications.
          </p>

          <ul className="mt-8 space-y-3">
            {BENEFITS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-white/90"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300 lg:h-5 lg:w-5" />
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
      <div className="flex w-full flex-col bg-white">
        {/* Mobile brand bar - මොබයිල් එකේදී විතරක් පේනවා */}
        <div className="flex h-14 items-center justify-between border-b border-gray-100 px-3 sm:px-6 lg:hidden">
          <Logo size="sm" />
        </div>

        {/* Centered content - මෙතන තමයි ප්‍රධාන වෙනස කළේ */}
        <div className="flex flex-1 items-center justify-center px-3 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}