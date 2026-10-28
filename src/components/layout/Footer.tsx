import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

// ---------------------------------------------------------------------------
// Link groups — grouped by purpose so visitors find their column instantly.
// ---------------------------------------------------------------------------
const productLinks = [
  { href: "/jobs", label: "Browse jobs" },
  { href: "/jobs/category/engineering", label: "Engineering" },
  { href: "/jobs/category/design", label: "Design" },
  { href: "/jobs/category/marketing", label: "Marketing" },
];

const employerLinks = [
  { href: "/register?role=EMPLOYER", label: "Post a job" },
  { href: "/login", label: "Employer sign in" },
];

const accountLinks = [
  { href: "/register?role=JOB_SEEKER", label: "Create account" },
  { href: "/login", label: "Sign in" },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        {/* ─── Main grid ─── */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column (spans 2 on tablet, 1 on desktop) */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />

            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
              The job marketplace where every listing has a lifespan. No stale
              posts. No dead applications.
            </p>

            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-3 w-3" />
              Auto-expiring listings
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-900">
              Product
            </p>
            <ul className="mt-4 space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 transition hover:text-gray-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For employers */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-900">
              For employers
            </p>
            <ul className="mt-4 space-y-2.5">
              {employerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 transition hover:text-gray-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get started */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-900">
              Get started
            </p>
            <ul className="mt-4 space-y-2.5">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-900"
                  >
                    {link.label}
                    <ArrowRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Mini CTA */}
            <Link
              href="/register"
              className="group mt-5 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              Get started free
              <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* ─── Bottom bar ─── */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-6 text-xs text-gray-400 sm:flex-row">
          <p>© {new Date().getFullYear()} RealJobs. All rights reserved.</p>
          <p>Built with Next.js · Supabase · AWS</p>
        </div>
      </div>
    </footer>
  );
}