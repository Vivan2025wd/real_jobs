"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Plus,
  Building2,
  Search,
  FileText,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";

type Role = "EMPLOYER" | "JOB_SEEKER";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navByRole: Record<Role, { section: string; items: NavItem[] }[]> = {
  EMPLOYER: [
    {
      section: "Workspace",
      items: [
        {
          href: "/dashboard/employer",
          label: "Overview",
          icon: LayoutDashboard,
        },
        { href: "/dashboard/employer/jobs", label: "My jobs", icon: Briefcase },
        { href: "/dashboard/employer/jobs/new", label: "Post a job", icon: Plus },
      ],
    },
    {
      section: "Company",
      items: [
        {
          href: "/dashboard/employer/company",
          label: "Profile & logo",
          icon: Building2,
        },
      ],
    },
  ],
  JOB_SEEKER: [
    {
      section: "Workspace",
      items: [
        { href: "/dashboard/seeker", label: "Overview", icon: LayoutDashboard },
        {
          href: "/dashboard/seeker/applications",
          label: "My applications",
          icon: FileText,
        },
      ],
    },
    {
      section: "Profile",
      items: [
        {
          href: "/dashboard/seeker/profile",
          label: "Resume",
          icon: User,
        },
      ],
    },
    {
      section: "Discover",
      items: [{ href: "/jobs", label: "Browse jobs", icon: Search }],
    },
  ],
};

// ─── Brand mark (shared between desktop and mobile) ───────────────────
function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-bold">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm text-white shadow-sm">
        H
      </span>
      <span className="tracking-tight text-gray-900">HireLoop</span>
    </Link>
  );
}

// ─── Nav list (shared between desktop and mobile) ─────────────────────
function NavList({
  role,
  pathname,
  onNavigate,
}: {
  role: Role;
  pathname: string;
  onNavigate?: () => void;
}) {
  const sections = navByRole[role];

  return (
    <nav className="flex-1 space-y-6 px-3 py-4">
      {sections.map((section) => (
        <div key={section.section}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {section.section}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              // Exact match for overview roots, prefix match for everything else
              const isOverview =
                item.href === "/dashboard/employer" ||
                item.href === "/dashboard/seeker";
              const active = isOverview
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 ${
                      active
                        ? "text-indigo-600"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

// ─── User footer (shared between desktop and mobile) ──────────────────
function UserFooter({
  email,
  role,
  onNavigate,
}: {
  email: string;
  role: Role;
  onNavigate?: () => void;
}) {
  const roleLabel = role === "EMPLOYER" ? "Employer" : "Job seeker";

  return (
    <div className="border-t border-gray-100 p-3">
      <div className="rounded-lg bg-gray-50/80 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
            {email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-900">
              {email}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              {roleLabel}
            </p>
          </div>
        </div>
      </div>

      {/* FIX: POST form instead of GET Link. The /logout route is POST-only
          to prevent Next.js <Link> prefetch from silently signing the user
          out the moment the sidebar renders. */}
      <form action="/logout" method="post" className="mt-2">
        <button
          type="submit"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </form>
    </div>
  );
}

export function Sidebar({ role, email }: { role: Role; email: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ═══════════════ Desktop sidebar ═══════════════ */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-gray-100 px-5">
          <Brand />
        </div>
        <NavList role={role} pathname={pathname} />
        <UserFooter email={email} role={role} />
      </aside>

      {/* ═══════════════ Mobile topbar ═══════════════ */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur md:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ═══════════════ Mobile drawer ═══════════════ */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />

          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl md:hidden">
            <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <NavList
                role={role}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>

            <UserFooter
              email={email}
              role={role}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}
    </>
  );
}