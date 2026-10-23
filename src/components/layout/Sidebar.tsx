"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Role = "EMPLOYER" | "JOB_SEEKER";

const navByRole: Record<Role, { href: string; label: string }[]> = {
  EMPLOYER: [
    { href: "/dashboard/employer", label: "Overview" },
    { href: "/dashboard/employer/jobs", label: "My jobs" },
    { href: "/dashboard/employer/jobs/new", label: "Post a job" },
    { href: "/dashboard/employer/company", label: "Company profile" },
  ],
  JOB_SEEKER: [
    { href: "/dashboard/seeker", label: "Overview" },
    { href: "/dashboard/seeker/applications", label: "My applications" },
    { href: "/dashboard/seeker/profile", label: "Profile & resume" },
    { href: "/jobs", label: "Browse jobs" },
  ],
};

export function Sidebar({ role, email }: { role: Role; email: string }) {
  const pathname = usePathname();
  const items = navByRole[role];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-gray-200 px-6 font-bold">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">H</span>
          HireLoop
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active =
            item.href === "/dashboard/employer" || item.href === "/dashboard/seeker"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-4 text-xs text-gray-500">
        <p className="truncate">Signed in as</p>
        <p className="truncate font-medium text-gray-900">{email}</p>
        <Link href="/logout" className="mt-2 inline-block text-blue-600 hover:underline">
          Sign out
        </Link>
      </div>
    </aside>
  );
}