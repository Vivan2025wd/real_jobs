// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ලොග් වෙලා නැත්නම් ලොගින් එකට යවන්න
  if (!user) {
    redirect("/login");
  }

  // Role එක බලලා හරි තැනට යවන්න
  const role = user.user_metadata?.role?.toUpperCase();

  if (role === "EMPLOYER") {
    redirect("/dashboard/employer");
  } else {
    redirect("/dashboard/seeker");
  }
}