import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Trash2, User, Briefcase, Calendar, Inbox, ShieldAlert } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type UserRow = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------
async function deleteUser(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error("Unauthorized: Admin access required");
  }

  const userId = String(formData.get("userId"));
  const adminDb = createAdminClient();
  
  // Deleting from auth.users cascades to public.users, companies, applications!
  await adminDb.auth.admin.deleteUser(userId);
  revalidatePath("/admin/users");
}

// ---------------------------------------------------------------------------
// Reusable List Component
// ---------------------------------------------------------------------------
function UserList({ 
  title, 
  description, 
  icon: Icon, 
  data 
}: { 
  title: string; 
  description: string;
  icon: React.ElementType;
  data: UserRow[]; 
}) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 border-b border-gray-200 pb-2 sm:gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 sm:h-10 sm:w-10 sm:rounded-xl">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-gray-900 sm:text-lg">{title}</h2>
          <p className="truncate text-[11px] text-gray-500 sm:text-sm">{description}</p>
        </div>
        <div className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 sm:px-3 sm:py-1 sm:text-sm">
          {data.length}
        </div>
      </div>

      {/* List */}
      {!data.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center shadow-sm sm:p-8">
          <Inbox className="mb-2 h-6 w-6 text-gray-300 sm:h-8 sm:w-8" />
          <p className="text-xs text-gray-500 sm:text-sm">No {title.toLowerCase()} yet.</p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:gap-3">
          {data.map((u) => {
            const isEmployer = u.role === "EMPLOYER";
            
            return (
              <div
                key={u.id}
                className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-gray-300 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
              >
                
                {/* ─── Left: User Info ─── */}
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm sm:h-12 sm:w-12 sm:text-sm ${
                    isEmployer 
                      ? "bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700" 
                      : "bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-700"
                  }`}>
                    {u.email.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                      {u.email}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500 sm:mt-1 sm:text-xs">
                      <Calendar className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                      Joined {new Date(u.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </div>
                  </div>
                </div>

                {/* ─── Right: Role Badge & Actions ─── */}
                <div className="flex w-full items-center justify-between gap-2 pl-12 sm:w-auto sm:shrink-0 sm:justify-end sm:gap-3 sm:pl-0">
                  
                  {/* Role Badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ring-1 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[10px] ${
                      isEmployer
                        ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                        : "bg-blue-50 text-blue-700 ring-blue-200"
                    }`}
                  >
                    {isEmployer ? <Briefcase className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                    {isEmployer ? "Employer" : "Seeker"}
                  </span>

                  {/* Delete Action */}
                  <form action={deleteUser} className="flex items-center">
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 sm:h-8 sm:w-8"
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function AdminUsers() {
  const adminDb = createAdminClient();
  
  const { data: users, error } = await adminDb
    .from("users")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: false })
    .returns<UserRow[]>();

  if (error) {
    console.error("[admin/users] failed to load:", error);
  }

  const seekers = users?.filter((u) => u.role === "JOB_SEEKER") || [];
  const employers = users?.filter((u) => u.role === "EMPLOYER") || [];

  return (
    <div className="space-y-8 pb-8 sm:space-y-10 sm:pb-10">
      {/* ─── Page Header ─── */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          User Management
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500 sm:text-sm">
          View all registered accounts. Deleting a user removes their profile, jobs, and applications forever.
        </p>
      </div>

      {/* ─── Employers Section ─── */}
      <UserList 
        title="Employers" 
        description="Companies and recruiters posting jobs."
        icon={Briefcase}
        data={employers} 
      />

      {/* ─── Seekers Section ─── */}
      <UserList 
        title="Job Seekers" 
        description="Candidates applying for jobs."
        icon={User}
        data={seekers} 
      />
    </div>
  );
}