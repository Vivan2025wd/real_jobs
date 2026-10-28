// src/app/not-found.tsx
import Link from "next/link";
import { ArrowLeft, Search, Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 px-4 py-16">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Logo size="sm" />
        </div>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl">
          <Compass className="h-10 w-10" />
        </div>

        <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-indigo-600">
          404 · Page not found
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          This page has moved on
        </h1>

        <p className="mt-3 text-balance text-base leading-relaxed text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist, was removed, or
          the URL is wrong. Unlike our job listings, this link is truly expired.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/jobs" className="w-full sm:w-auto">
            <Button icon={<Search className="h-4 w-4" />} className="w-full sm:w-auto">
              Browse jobs
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              icon={<ArrowLeft className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              Back home
            </Button>
          </Link>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Try these instead
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {[
              { href: "/jobs", label: "All jobs" },
              { href: "/jobs/category/engineering", label: "Engineering" },
              { href: "/jobs/category/design", label: "Design" },
              { href: "/login", label: "Sign in" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
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