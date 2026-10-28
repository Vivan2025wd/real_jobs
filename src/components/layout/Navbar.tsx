"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Sparkles, Menu } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import Link from "next/link";
import { useState } from "react";

const PUBLIC_NAV = [
  { href: "/jobs", label: "Browse jobs" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const { user, role, loading, isSignedIn, isEmployer } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardHref = isEmployer
    ? "/dashboard/employer"
    : "/dashboard/seeker";

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/60 glass">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* ─── Brand ─── */}
        <Logo />

        {/* ─── Desktop nav ─── */}
        <nav className="hidden items-center gap-1 sm:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* ─── Auth-dependent right side ─── */}
          {loading ? (
            <>
              <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-100" />
              <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-100" />
            </>
          ) : isSignedIn && user ? (
            <>
              <Link
                href={dashboardHref}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname.startsWith("/dashboard")
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>

              {/* POST form — /logout is POST-only to avoid prefetch logout */}
              <form action="/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-rose-50 hover:text-rose-700"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                >
                  Get started
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* ─── Mobile hamburger ─── */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 sm:hidden"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ─── Mobile dropdown ─── */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-1">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-base font-medium transition ${
                  isActive(item.href)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {loading ? (
              <div className="h-11 animate-pulse rounded-lg bg-gray-100" />
            ) : isSignedIn && user ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 text-base font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
                <form action="/logout" method="post">
                  <button
                    type="submit"
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base font-medium text-gray-600 transition hover:bg-rose-50 hover:text-rose-700"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-base font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-base font-medium text-white transition hover:bg-indigo-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}