import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { PayHereButton } from "@/components/payment/PayHereButton";
import { VerificationToggle } from "@/components/employer/VerificationToggle";
import { ViewResumeButton } from "@/components/employer/ViewResumeButton";
import { formatSalary, formatDate, timeAgo } from "@/lib/utils/format";
import type { ApplicationWithSeeker, JobRow } from "@/types/job";

// ---------------------------------------------------------------------------
// Composite of the shared JobRow with the single-level `companies` embed.
// `select("*", …)` fetches every JobRow column, so the full row type applies;
// the embed adds only the two fields the header needs.
//
// `.returns<T>()` would override inference, but PostgREST still collapses the
// multi-column `select("*") + join` shape to `never` before the override
// applies. Casting the awaited result remains the reliable escape hatch.
// ---------------------------------------------------------------------------
type JobWithCompany = JobRow & {
  companies: {
    employer_id: string;
    company_name: string;
  };
};

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------
async function confirmHiring(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const supabase = await createClient();
  await supabase
    .from("jobs")
    .update({ last_verified_at: new Date().toISOString() } as never)
    .eq("id", jobId);

  revalidatePath(`/dashboard/employer/jobs/${jobId}`);
  revalidatePath("/dashboard/employer/jobs");
  revalidatePath("/dashboard/employer");
}

async function markFilled(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const supabase = await createClient();
  await supabase
    .from("jobs")
    .update({ status: "FILLED" } as never)
    .eq("id", jobId);

  revalidatePath(`/dashboard/employer/jobs/${jobId}`);
  revalidatePath("/dashboard/employer/jobs");
  revalidatePath("/dashboard/employer");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function EmployerJobDetailPage({
  params,
  searchParams,
}: {
  params: { jobId: string };
  searchParams: { payment?: string };
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
      {searchParams.payment === "success" && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">Payment received ✓</p>
          <p className="mt-0.5">
            We&apos;re confirming with PayHere now. If the status below still
            shows <strong>Draft</strong>, refresh in a few seconds — the webhook
            activates the job automatically.
          </p>
        </div>
      )}
      {searchParams.payment === "cancelled" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Payment cancelled. You can try again below whenever you&apos;re ready.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {typedJob.title}
            </h1>
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

      {typedJob.status === "ACTIVE" && (
        <VerificationToggle
          jobId={typedJob.id}
          lastVerifiedAt={typedJob.last_verified_at}
          onConfirm={confirmHiring}
          onMarkFilled={markFilled}
        />
      )}

      {typedJob.status === "DRAFT" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="font-semibold text-amber-900">Not published yet</h3>
          <p className="mt-1 text-sm text-amber-800">
            Pay the LKR 2,500 listing fee to activate this job. PayHere handles
            the transaction — no card details touch our servers.
          </p>
          <div className="mt-4">
            <PayHereButton jobId={typedJob.id} />
          </div>
        </div>
      )}

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
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {a.users.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      Applied {timeAgo(a.applied_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={a.status} />
                    <ViewResumeButton resumeKey={a.resume_url} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}