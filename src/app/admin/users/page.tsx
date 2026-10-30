import { createAdminClient } from "@/lib/supabase/admin";
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
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="ml-auto rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200">
          {data.length}
        </div>
      </div>

      {/* List */}
      {!data.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
          <Inbox className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No {title.toLowerCase()} yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {data.map((u) => {
            const isEmployer = u.role === "EMPLOYER";
            
            return (
              <div
                key={u.id}
                className="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                
                {/* ─── Left: User Info ─── */}
                <div className="flex min-w-0 items-center gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm sm:h-12 sm:w-12 ${
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
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      Joined {new Date(u.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </div>
                  </div>
                </div>

                {/* ─── Right: Role Badge & Actions ─── */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pl-14 sm:pl-0 sm:shrink-0">
                  
                  {/* Role Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ring-1 ${
                      isEmployer
                        ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                        : "bg-blue-50 text-blue-700 ring-blue-200"
                    }`}
                  >
                    {isEmployer ? <Briefcase className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {isEmployer ? "Employer" : "Seeker"}
                  </span>

                  {/* Delete Action */}
                  <form action={deleteUser} className="flex items-center">
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"
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
    <div className="space-y-10 pb-10">
      {/* ─── Page Header ─── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          User Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
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