import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ApplicationCard } from "@/components/applications/ApplicationCard";
import { Button } from "@/components/ui/Button";
import type { ApplicationWithJob } from "@/types/job";

export default async function SeekerApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, applied_at, jobs!inner(title, companies!inner(company_name))")
    .eq("seeker_id", user!.id)
    .order("applied_at", { ascending: false });

  const applicationRows = applications as ApplicationWithJob[] | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My applications</h1>
          <p className="text-gray-500">Every role you have applied to.</p>
        </div>
        <Link href="/jobs">
          <Button variant="secondary">Browse jobs</Button>
        </Link>
      </div>

      {!applicationRows?.length ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">No applications yet.</p>
          <Link href="/jobs" className="mt-4 inline-block">
            <Button>Browse open roles</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {applicationRows.map((a) => {
            const job = a.jobs;
            return (
              <ApplicationCard
                key={a.id}
                jobTitle={job.title}
                companyName={job.companies.company_name}
                status={a.status}
                appliedAt={a.applied_at}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}