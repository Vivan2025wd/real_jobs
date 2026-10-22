import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/utils/format";

export default async function EmployerOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: companyData } = await supabase
    .from("companies")
    .select("id, company_name")
    .eq("employer_id", user!.id)
    .maybeSingle();
  const company = companyData as { id: string; company_name: string } | null;

  if (!company) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, employer 👋</h1>
        <p className="mt-2 text-gray-600">Set up your company profile before posting jobs.</p>
        <Link href="/dashboard/employer/company">
          <Button className="mt-6">Create company profile</Button>
        </Link>
      </div>
    );
  }

  const [{ count: totalJobs }, { count: activeJobs }, { count: draftJobs }, { count: totalApplications }] =
    await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "ACTIVE"),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "DRAFT"),
      supabase.from("applications").select("id, job_id!inner(company_id)", { count: "exact", head: true }).eq("job_id.company_id", company.id),
    ]);

  const { data: recentApplicationsData } = await supabase
    .from("applications")
    .select("id, status, applied_at, jobs!inner(title, company_id), users!inner(email)")
    .eq("jobs.company_id", company.id)
    .order("applied_at", { ascending: false })
    .limit(5);
  const recentApplications = recentApplicationsData as unknown as {
    id: string;
    status: Parameters<typeof StatusBadge>[0]["status"];
    applied_at: string;
    jobs: { title: string; company_id: string };
    users: { email: string };
  }[] | null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{company.company_name}</h1>
        <p className="text-gray-500">Here is what is happening with your hiring pipeline.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total jobs", value: totalJobs ?? 0 },
          { label: "Active jobs", value: activeJobs ?? 0 },
          { label: "Drafts", value: draftJobs ?? 0 },
          { label: "Applications", value: totalApplications ?? 0 },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Recent applications"
          action={
            <Link href="/dashboard/employer/jobs">
              <Button variant="secondary" size="sm">View all jobs</Button>
            </Link>
          }
        />
        <CardBody>
          {!recentApplications?.length ? (
            <p className="text-sm text-gray-500">No applications yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentApplications.map((a) => {
                const job = a.jobs as { title: string; company_id: string };
                const seeker = a.users as { email: string };
                return (
                  <li key={a.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-gray-900">{seeker.email}</p>
                      <p className="text-sm text-gray-500">
                        Applied to <span className="font-medium">{job.title}</span> · {timeAgo(a.applied_at)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}