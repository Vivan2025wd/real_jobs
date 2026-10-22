// src/app/(auth)/register/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/ui/SubmitButton";

type SearchParams = Promise<{
  error?: string;
  message?: string;
  role?: string;
}>;

async function register(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const roleRaw = String(formData.get("role") ?? "JOB_SEEKER").toUpperCase();
  const role: "EMPLOYER" | "JOB_SEEKER" =
    roleRaw === "EMPLOYER" ? "EMPLOYER" : "JOB_SEEKER";

  if (!email || !password) {
    redirect("/register?error=" + encodeURIComponent("All fields are required."));
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

  // If email confirmation is DISABLED, signUp returns a session immediately.
  if (data.session && data.user) {
    await (supabase as any).from("users").upsert({
      id: data.user.id,
      email: data.user.email!,
      role,
    });

    revalidatePath("/", "layout");
    redirect(role === "EMPLOYER" ? "/dashboard/employer" : "/dashboard/seeker");
  }

  // Email confirmation is ENABLED — user must click the link in their inbox.
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
  const { error, message, role: preselectedRole } = await searchParams;
  const initialRole =
    preselectedRole === "EMPLOYER" ? "EMPLOYER" : "JOB_SEEKER";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-bold"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            H
          </span>
          HireLoop
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Join as an employer or a job seeker.
          </p>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </div>
          )}

          <form action={register} className="mt-6 space-y-4">
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700">
                I am a…
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { value: "JOB_SEEKER", label: "Job seeker" },
                  { value: "EMPLOYER", label: "Employer" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      defaultChecked={initialRole === opt.value}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                At least 8 characters.
              </p>
            </div>

            <div>
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <SubmitButton pendingText="Creating account…">
              Create account
            </SubmitButton>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}