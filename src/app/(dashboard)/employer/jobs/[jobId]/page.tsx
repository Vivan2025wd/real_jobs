import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatSalary, formatDate, timeAgo } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Explicit row types.
// Supabase's join inference returns `never` when the generated types lack
// the Relationships metadata for the joined table. `.returns<T>()` overrides
// the inferred type with the shape we actually select.
// ---------------------------------------------------------------------------
type JobWithCompany = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string;
  work_type: "REMOTE" | "ONSITE" | "HYBRID";
  salary_min: number | null;
  salary_max: number | null;
  status: "DRAFT" | "ACTIVE" | "FILLED" | "EXPIRED" | "ARCHIVED";
  created_at: string;
  last_verified_at: string | null;
  companies: {
    employer_id: string;
    company_name: string;
  };
};

type ApplicationWithSeeker = {
  id: string;
  status: "PENDING" | "REVIEWED" | "SHORTLISTED" | "REJECTED";
  applied_at: string;
  resume_url: string;
  users: {
    email: string;
  };
};

export default async function EmployerJobDetailPage({
  params,
}: {
  params: { jobId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, companies!inner(employer_id, company_name)")
    .eq("id", params.jobId)
    .maybeSingle();

  const typedJob = job as JobWithCompany | null;

  if (!typedJob || typedJob.companies.employer_id !== user.id) notFound();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, applied_at, resume_url, users!inner(email)")
    .eq("job_id", typedJob.id)
    .order("applied_at", { ascending: false });

  const typedApplications = (applications ?? []) as ApplicationWithSeeker[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{typedJob.title}</h1>
            <StatusBadge status={typedJob.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {typedJob.work_type} · {typedJob.location} ·{" "}
            {formatSalary(typedJob.salary_min, typedJob.salary_max)}
          </p>
          <p className="text-xs text-gray-400">
            Posted {formatDate(typedJob.created_at)}
            {typedJob.last_verified_at && (
              <> · Last verified {timeAgo(typedJob.last_verified_at)}</>
            )}
          </p>
        </div>
        <Link href={`/dashboard/employer/jobs/${typedJob.id}/edit`}>
          <Button variant="secondary">Edit</Button>
        </Link>
      </div>

      <Card>
        <CardHeader title="Description" />
        <CardBody>
          <p className="whitespace-pre-line text-sm text-gray-700">
            {typedJob.description}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Applications (${typedApplications.length})`} />
        <CardBody className="p-0">
          {!typedApplications.length ? (
            <p className="px-6 py-8 text-center text-sm text-gray-500">
              No applications yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {typedApplications.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {a.users.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      Applied {timeAgo(a.applied_at)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}