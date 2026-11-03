import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase } from "lucide-react";
import { createSourcedJob } from "@/app/actions/sourced-jobs";
import { JobForm } from "@/components/employer/JobForm";
import { createClient } from "@/lib/supabase/server";

export default async function NewSourcedJobPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 sm:text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      <header className="rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:rounded-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Post a sourced job</h1>
            <p className="mt-1 text-sm text-gray-600">
              The listing will be live for 14 days. The employer receives only applicant counts and a claim link.
            </p>
          </div>
        </div>
      </header>

      {searchParams.error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {searchParams.error}
        </p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:rounded-2xl sm:p-6">
        <JobForm
          action={createSourcedJob}
          isAdmin
          isSourcedJob
          submitLabel="Publish sourced listing"
        />
      </div>
    </div>
  );
}
