// src/app/not-found.tsx
import Link from "next/link";
import { ArrowLeft, Search, Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    // overflow-x-hidden සහ w-full දැම්මා horizontal scroll එක නවත්තන්න
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 px-3 py-10 sm:px-4 sm:py-16">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />

      <div className="relative mx-auto w-full max-w-md text-center">
        <div className="mb-6 flex justify-center sm:mb-8">
          <Logo size="sm" />
        </div>

        {/* ලොකු අයිකන් එක මොබයිල් එකේදී පොඩි කළා */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl sm:h-20 sm:w-20 sm:rounded-3xl">
          <Compass className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-indigo-600 sm:mt-8 sm:text-sm">
          404 · Page not found
        </p>

        <h1 className="mt-1.5 text-balance text-2xl font-bold tracking-tight text-gray-900 sm:mt-2 sm:text-4xl">
          This page has moved on
        </h1>

        <p className="mt-2 text-balance text-sm leading-relaxed text-gray-600 sm:mt-3 sm:text-base">
          The page you&apos;re looking for doesn&apos;t exist, was removed, or
          the URL is wrong. Unlike our job listings, this link is truly expired.
        </p>

        <div className="mt-6 flex flex-col items-center gap-2.5 sm:mt-8 sm:flex-row sm:justify-center sm:gap-3">
          <Link href="/jobs" className="w-full sm:w-auto">
            <Button 
              icon={<Search className="h-4 w-4" />} 
              className="w-full justify-center sm:w-auto"
            >
              Browse jobs
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              icon={<ArrowLeft className="h-4 w-4" />}
              className="w-full justify-center sm:w-auto"
            >
              Back home
            </Button>
          </Link>
        </div>

        {/* Try these instead ටැග් ටික මොබයිල් එකට ගැලපෙන විදියට */}
        <div className="mt-8 border-t border-gray-200 pt-5 sm:mt-10 sm:pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">
            Try these instead
          </p>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 sm:mt-3 sm:gap-2">
            {[
              { href: "/jobs", label: "All jobs" },
              { href: "/jobs/category/engineering", label: "Engineering" },
              { href: "/jobs/category/design", label: "Design" },
              { href: "/login", label: "Sign in" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:px-3 sm:py-1.5 sm:text-xs"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}