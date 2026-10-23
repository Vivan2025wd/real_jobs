import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-gray-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-xs text-white">
            H
          </span>
          <span>© {new Date().getFullYear()} HireLoop</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <Link href="/jobs" className="hover:text-gray-900">
            Browse jobs
          </Link>
          <Link href="/register?role=EMPLOYER" className="hover:text-gray-900">
            For employers
          </Link>
          <Link href="/login" className="hover:text-gray-900">
            Sign in
          </Link>
        </nav>

        <p className="text-xs">
          Built with Next.js, Supabase &amp; AWS
        </p>
      </div>
    </footer>
  );
}