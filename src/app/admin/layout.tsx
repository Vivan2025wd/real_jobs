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
    <div className="min-h-screen w-full bg-gray-50">
      {/* Sidebar Component */}
      <AdminSidebar />

      {/* 
        Main Content Area 
        - Added pt-14 for mobile topbar offset
        - Added md:pl-64 to push content right on desktop
        - Added w-full max-w-full to prevent horizontal overflow
      */}
      <main className="w-full pt-14 md:pl-64 md:pt-0">
        {/* 
          Mobile padding එක px-3 py-4 ට අඩු කළා (කලින් p-4).
          Tablet සහ Desktop වලදී ආයේ ලොකු වෙනවා.
        */}
        <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}