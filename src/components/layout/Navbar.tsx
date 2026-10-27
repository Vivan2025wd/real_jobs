// src/components/layout/Navbar.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role =
    (user?.user_metadata?.role as string)?.toUpperCase() === "EMPLOYER"
      ? "EMPLOYER"
      : user
        ? "JOB_SEEKER"
        : null;

  const dashboardHref =
    role === "EMPLOYER" ? "/dashboard/employer" : "/dashboard/seeker";

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            H
          </span>
          HireLoop
        </Link>

        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/jobs"
            className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            Browse jobs
          </Link>

          {user ? (
            <>
              <Link
                href={dashboardHref}
                className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <form action="/logout" method="post">
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}