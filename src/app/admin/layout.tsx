import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Security check: Only the admin can access these pages
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Component */}
      <AdminSidebar />

      {/* 
        Main Content Area 
        - Added pt-14 for mobile topbar offset
        - Added md:pl-64 to push content right on desktop (since sidebar is fixed)
      */}
      <main className="pt-14 md:pl-64 md:pt-0">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}