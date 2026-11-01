"use client";

import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Sparkles, Menu } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PUBLIC_NAV = [
  { href: "/jobs", label: "Browse jobs" },
] as const;

export function Navbar({
  initialUser,
}: {
  initialUser?: User | null;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const hook = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = hook.loading ? (initialUser ?? null) : hook.user;
  const loading = initialUser === undefined ? hook.loading : false;

  const isSignedIn = !!user;
  const role =
    (user?.user_metadata?.role as string)?.toUpperCase() === "EMPLOYER"
      ? "EMPLOYER"
      : user
        ? "JOB_SEEKER"
        : null;
  const isEmployer = role === "EMPLOYER";

  const dashboardHref = isEmployer
    ? "/dashboard/employer"
    : "/dashboard/seeker";

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/login");
    router.refresh();
  };

  return (
    // Mobile එකේදී උස h-14, Desktop එකේදී sm:h-16
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/60 glass">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:h-16 sm:px-4">
        
        {/* Logo එක මොබයිල් එකේදී පොඩියට ගන්න size="sm" දැම්මා */}
        <div className="flex items-center gap-2">
          <Logo size="sm" />
        </div>

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

              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
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
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 sm:hidden"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ─── Mobile dropdown ─── */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white px-3 py-2.5 sm:hidden">
          <nav className="flex flex-col gap-1">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                // මෙනු එකේ ලින්ක් අකුරු text-base එකෙන් text-sm එකට අඩු කළා
                className={`flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
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
                  className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                
                <button
                  onClick={handleSignOut}
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition hover:bg-rose-50 hover:text-rose-700"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
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