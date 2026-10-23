import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role =
    (user.user_metadata?.role as string)?.toUpperCase() === "EMPLOYER"
      ? "EMPLOYER"
      : "JOB_SEEKER";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={role} email={user.email ?? ""} />
      <div className="flex-1">
        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}