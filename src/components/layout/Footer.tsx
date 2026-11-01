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
    <footer className="w-full overflow-hidden border-t border-gray-200 bg-white">
      {/* මොබයිල් එකේදී පැඩින් px-3.5 py-8 කළා */}
      <div className="mx-auto w-full max-w-6xl px-3.5 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        {/* ─── Main grid ─── */}
        {/* මොබයිල් එකේදී gap-6, ඩෙස්ක්ටොප් එකේදී sm:gap-8 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
          
          {/* Brand column (spans 2 on tablet, 1 on desktop) */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo size="sm" />

            <p className="mt-3 max-w-xs text-xs leading-relaxed text-gray-500 sm:mt-4 sm:text-sm">
              The job marketplace where every listing has a lifespan. No stale
              posts. No dead applications.
            </p>

            <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 sm:mt-4 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs">
              <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Auto-expiring listings
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-900 sm:text-xs">
              Product
            </p>
            <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-500 transition hover:text-gray-900 sm:text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For employers */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-900 sm:text-xs">
              For employers
            </p>
            <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
              {employerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-500 transition hover:text-gray-900 sm:text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get started */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-900 sm:text-xs">
              Get started
            </p>
            <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-xs text-gray-500 transition hover:text-gray-900 sm:text-sm"
                  >
                    {link.label}
                    <ArrowRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Mini CTA - මොබයිල් එකේදී w-full කළා */}
            <div className="mt-4 w-full sm:mt-5 sm:w-auto">
              <Link
                href="/register"
                className="group inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 sm:w-auto sm:py-2"
              >
                Get started free
                <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Bottom bar ─── */}
        {/* මොබයිල් එකේදී ඉඩ අඩු කළා (mt-8 pt-5) */}
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-gray-100 pt-5 text-[10px] text-gray-400 sm:mt-12 sm:flex-row sm:gap-3 sm:pt-6 sm:text-xs">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} RealJobs. All rights reserved.
          </p>
          <p className="text-center sm:text-right">
            Built with Next.js · Supabase · AWS
          </p>
        </div>
      </div>
    </footer>
  );
}