"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  ShieldCheck,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/jobs", label: "Jobs & Apps", icon: Briefcase },
  { href: "/admin/companies", label: "Companies", icon: Building2 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Helper to check active link
  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  // Common Nav List rendering
  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 space-y-1 p-3 sm:p-4">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors sm:gap-3 ${
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <item.icon
              className={`h-4 w-4 shrink-0 ${
                active ? "text-indigo-600" : "text-gray-400"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ═══════════════ Desktop Sidebar ═══════════════ */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6 font-bold text-indigo-700">
          <ShieldCheck className="h-5 w-5" /> Admin Control
        </div>
        <NavLinks />
        <div className="border-t border-gray-100 p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to App
          </Link>
        </div>
      </aside>

      {/* ═══════════════ Mobile Topbar ═══════════════ */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white/90 px-3 backdrop-blur sm:px-4 md:hidden">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-base font-bold text-indigo-700"
        >
          <ShieldCheck className="h-5 w-5" /> Admin
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ═══════════════ Mobile Drawer ═══════════════ */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl md:hidden">
            {/* Drawer Header */}
            <div className="flex h-14 items-center justify-between border-b border-gray-100 px-3">
              <span className="flex items-center gap-2 text-sm font-bold text-indigo-700">
                <ShieldCheck className="h-4 w-4" /> Menu
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            
            {/* Drawer Footer */}
            <div className="border-t border-gray-100 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-indigo-600"
              >
                <ArrowLeft className="h-4 w-4" /> Back to App
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}