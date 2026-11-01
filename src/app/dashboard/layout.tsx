import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role =
    (user.user_metadata?.role as string)?.toUpperCase() === "EMPLOYER"
      ? "EMPLOYER"
      : "JOB_SEEKER";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Mobile topbar offset (h-14) — pushed down on small screens */}
      <div className="flex pt-14 md:pt-0">
        <Sidebar role={role} email={user.email ?? ""} />

        {/* min-w-0 prevents flex items from overflowing horizontally */}
        <main className="min-w-0 w-full flex-1">
          {/* 
            Reduced mobile padding to maximize screen real estate:
            - px-3 (mobile) -> sm:px-6 (tablet) -> lg:px-8 (desktop)
            - py-4 (mobile) -> sm:py-6 -> lg:py-8
          */}
          <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}