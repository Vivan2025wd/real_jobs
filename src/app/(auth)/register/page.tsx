// src/app/(auth)/register/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { User, Briefcase, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { SubmitButton } from "@/components/ui/SubmitButton";

type SearchParams = {
  error?: string;
  message?: string;
  role?: string;
};

async function register(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const roleRaw = String(formData.get("role") ?? "JOB_SEEKER").toUpperCase();
  const role: "EMPLOYER" | "JOB_SEEKER" =
    roleRaw === "EMPLOYER" ? "EMPLOYER" : "JOB_SEEKER";

  if (!email || !password) {
    redirect(
      "/register?error=" + encodeURIComponent("All fields are required.")
    );
  }
  if (password.length < 8) {
    redirect(
      "/register?error=" +
        encodeURIComponent("Password must be at least 8 characters.")
    );
  }
  if (password !== confirmPassword) {
    redirect("/register?error=" + encodeURIComponent("Passwords do not match."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
    },
  });

  if (error) {
    redirect("/register?error=" + encodeURIComponent(error.message));
  }

  if (data.session && data.user) {
    revalidatePath("/", "layout");
    redirect(
      role === "EMPLOYER" ? "/dashboard/employer" : "/dashboard/seeker"
    );
  }

  redirect(
    "/register?message=" +
      encodeURIComponent("Check your inbox to confirm your account.")
  );
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, message, role: preselectedRole } = searchParams;
  const initialRole =
    preselectedRole === "EMPLOYER" ? "EMPLOYER" : "JOB_SEEKER";

  return (
    <AuthShell>
      {/* Heading */}
      <div>
        <h2 className="text-balance text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          Create your account
        </h2>
        <p className="mt-1.5 text-sm text-gray-500 sm:mt-1">
          Join RealJobs as an employer or a job seeker.
        </p>
      </div>

      {/* Banners */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 sm:mt-5 sm:gap-2.5 sm:px-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <p className="text-sm leading-snug text-rose-800">{error}</p>
        </div>
      )}
      {message && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 sm:mt-5 sm:gap-2.5 sm:px-3.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-sm leading-snug text-emerald-800">{message}</p>
        </div>
      )}

      {/* Form */}
      <form action={register} className="mt-5 space-y-3.5 sm:mt-6 sm:space-y-4">
        {/* Role selection */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700">
            I am a…
          </legend>
          <div className="mt-1.5 grid grid-cols-1 gap-2 sm:mt-2 sm:grid-cols-2">
            {[
              {
                value: "JOB_SEEKER",
                label: "Job seeker",
                icon: User,
                hint: "Find roles",
              },
              {
                value: "EMPLOYER",
                label: "Employer",
                icon: Briefcase,
                hint: "Hire talent",
              },
            ].map((opt) => {
              const Icon = opt.icon;
              return (
                <label
                  key={opt.value}
                  className="group relative flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-2.5 transition has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:ring-1 has-[:checked]:ring-indigo-200 hover:border-gray-300 sm:items-start sm:p-3"
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    defaultChecked={initialRole === opt.value}
                    className="sr-only"
                  />
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition group-has-[:checked]:bg-white group-has-[:checked]:text-indigo-600 group-has-[:checked]:ring-1 group-has-[:checked]:ring-indigo-200">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500">{opt.hint}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Email */}
        <div className="w-full">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:px-3.5 sm:text-sm"
            placeholder="you@example.com"
          />
        </div>

        {/* Password */}
        <div className="w-full">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:px-3.5 sm:text-sm"
          />
          <p className="mt-1.5 text-xs text-gray-500">At least 8 characters.</p>
        </div>

        {/* Confirm password */}
        <div className="w-full">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:px-3.5 sm:text-sm"
          />
        </div>

        {/* Submit */}
        <div className="pt-1">
          <SubmitButton pendingText="Creating account…">
            Create account
          </SubmitButton>
        </div>
      </form>

      {/* Switch link */}
      <p className="mt-5 text-center text-sm text-gray-500 sm:mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}