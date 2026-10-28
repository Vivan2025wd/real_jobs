import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  MapPin,
  Banknote,
  Clock,
  Calendar,
  Edit3,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Inbox,
  Timer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { PayHereButton } from "@/components/payment/PayHereButton";
import { VerificationToggle } from "@/components/employer/VerificationToggle";
import { ViewResumeButton } from "@/components/employer/ViewResumeButton";
import { ApplicationStatusSelect } from "@/components/employer/ApplicationStatusSelect";
import { formatSalary, formatDate, timeAgo } from "@/lib/utils/format";
import type { ApplicationWithSeeker, JobRow } from "@/types/job";

type JobWithCompany = JobRow & {
  companies: {
    employer_id: string;
    company_name: string;
  };
};

const WORK_TYPE_LABEL: Record<string, string> = {
  REMOTE: "Remote",
  ONSITE: "On-site",
  HYBRID: "Hybrid",
};

// ---------------------------------------------------------------------------
// Expiry countdown
// ---------------------------------------------------------------------------
function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / 86_400_000));

  const tone =
    days === 0
      ? "text-rose-600 font-medium"
      : days <= 3
        ? "text-rose-500"
        : days <= 7
          ? "text-amber-600"
          : "text-gray-400";

  const label =
    days === 0
      ? "Expires today"
      : `Expires in ${days} day${days === 1 ? "" : "s"}`;

  return (
    <span className={`inline-flex items-center gap-1 ${tone}`}>
      <Timer className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

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

// ─── Update application status + notify seeker ───
async function updateApplicationStatus(jobId: string, formData: FormData) {
  "use server";

  const applicationId = String(formData.get("applicationId") ?? "");
  const newStatus = String(formData.get("status") ?? "") as
    | "PENDING"
    | "REVIEWED"
    | "SHORTLISTED"
    | "REJECTED";

  if (!applicationId || !newStatus) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Diagnostic log — confirms the form reached the action. If you never see
  // this line in the terminal when changing the dropdown, the form isn't
  // submitting at all.
  console.log("[updateApplicationStatus] called:", {
    applicationId,
    newStatus,
    jobId,
    userId: user.id,
  });

  // Update the status. RLS enforces that the employer owns the job this
  // application belongs to. The select returns the joined user + job so we
  // can build the email without a second round-trip.
  const { data: updatedApp, error } = await supabase
    .from("applications")
    .update({ status: newStatus } as never)
    .eq("id", applicationId)
    .select(
      "id, status, users!inner(email), jobs!inner(title, companies!inner(company_name))"
    )
    .maybeSingle();

  if (error) {
    console.error(
      "[updateApplicationStatus] update returned an error:",
      error
    );
    return;
  }
  if (!updatedApp) {
    console.error(
      "[updateApplicationStatus] update affected 0 rows — RLS likely blocked it. " +
        "Check that the employer has an UPDATE policy on applications for their jobs. " +
        `applicationId=${applicationId}, newStatus=${newStatus}, userId=${user.id}`
    );
    return;
  }

  // Deep embeds collapse to `never` in TS — cast to the shape we selected.
  const app = updatedApp as unknown as {
    users: { email: string };
    jobs: { title: string; companies: { company_name: string } };
  };

  // Only email on "notification-worthy" transitions. Don't email when
  // reverting to PENDING — that's the employer undoing a mistake.
  if (["REVIEWED", "SHORTLISTED", "REJECTED"].includes(newStatus)) {
    const statusLabel =
      newStatus === "REVIEWED"
        ? "Under Review"
        : newStatus === "SHORTLISTED"
          ? "Shortlisted"
          : "Not Selected";

    const statusColor =
      newStatus === "SHORTLISTED"
        ? "#059669" // emerald-600
        : newStatus === "REJECTED"
          ? "#e11d48" // rose-600
          : "#4f46e5"; // indigo-600

    try {
      await sendEmail({
        to: app.users.email,
        subject: `Update on your application for ${app.jobs.title}`,
        html: `
          <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="display: inline-block; width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; font-weight: 700; line-height: 32px;">R</span>
            </div>
            <h1 style="font-size: 22px; color: #111827; margin: 0 0 8px;">Application update</h1>
            <p style="color: #374151; line-height: 1.6; font-size: 15px;">
              Your application for <strong>${app.jobs.title}</strong> at
              <strong>${app.jobs.companies.company_name}</strong> has been updated.
            </p>
            <div style="background: #f9fafb; border-left: 3px solid ${statusColor}; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; color: #6b7280;">New status</p>
              <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600; color: ${statusColor};">${statusLabel}</p>
            </div>
            <div style="text-align: center; margin-top: 28px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/seeker/applications"
                 style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                View application
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
              You're receiving this because you applied via RealJobs.
            </p>
          </div>
        `,
      });
    } catch (err) {
      // Email failure should not fail the status update — the DB write is
      // already committed. Just log it.
      console.error("[updateApplicationStatus] email send failed:", err);
    }
  }

  revalidatePath(`/dashboard/employer/jobs/${jobId}`);
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

  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select("id, status, applied_at, resume_url, users!inner(email)")
    .eq("job_id", typedJob.id)
    .order("applied_at", { ascending: false });

  if (applicationsError) {
    console.error(
      "[employer job detail] applications failed:",
      applicationsError
    );
  }

  const typedApplications = (applications ?? []) as ApplicationWithSeeker[];

  return (
    <div className="space-y-6">
      {/* ─── Payment banners ─── */}
      {searchParams.payment === "success" && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">Payment received</p>
            <p className="mt-0.5 text-sm text-emerald-800">
              We&apos;re confirming with PayHere now. If the status below still
              shows <strong>Draft</strong>, refresh in a few seconds — the
              webhook activates the job automatically.
            </p>
          </div>
        </div>
      )}
      {searchParams.payment === "cancelled" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-amber-900">Payment cancelled</p>
            <p className="mt-0.5 text-sm text-amber-800">
              You can try again below whenever you&apos;re ready.
            </p>
          </div>
        </div>
      )}

      {/* ─── Header card ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-balance text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">
                {typedJob.title}
              </h1>
              <StatusBadge status={typedJob.status} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gray-400" />
                {typedJob.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-gray-400" />
                {formatSalary(typedJob.salary_min, typedJob.salary_max)}
              </span>
              <Badge tone="blue">
                {WORK_TYPE_LABEL[typedJob.work_type] ?? typedJob.work_type}
              </Badge>
              {typedJob.category && (
                <Badge tone="gray">
                  {typedJob.category.charAt(0) +
                    typedJob.category.slice(1).toLowerCase().replace("_", " ")}
                </Badge>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1 text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
                Posted {formatDate(typedJob.created_at)}
              </span>
              {typedJob.last_verified_at && (
                <span className="inline-flex items-center gap-1 text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  Last verified {timeAgo(typedJob.last_verified_at)}
                </span>
              )}
              {typedJob.status === "ACTIVE" && typedJob.expires_at && (
                <ExpiryCountdown expiresAt={typedJob.expires_at} />
              )}
            </div>
          </div>

          <Link
            href={`/dashboard/employer/jobs/${typedJob.id}/edit`}
            className="shrink-0"
          >
            <Button variant="secondary" icon={<Edit3 className="h-4 w-4" />}>
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Verification toggle ─── */}
      {typedJob.status === "ACTIVE" && (
        <VerificationToggle
          jobId={typedJob.id}
          lastVerifiedAt={typedJob.last_verified_at}
          onConfirm={confirmHiring}
          onMarkFilled={markFilled}
        />
      )}

      {/* ─── DRAFT payment banner ─── */}
      {typedJob.status === "DRAFT" && (
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-card">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-200/30 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                  Ready to publish?
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Pay the{" "}
                  <strong className="text-gray-900">
                    LKR {typedJob.price_lkr.toLocaleString("en-LK")}
                  </strong>{" "}
                  listing fee to activate this{" "}
                  <strong>{typedJob.duration_days}-day</strong> job. PayHere
                  handles the transaction — no card details touch our servers.
                </p>
              </div>
            </div>
            <div className="w-full sm:w-auto sm:shrink-0">
              <PayHereButton
                jobId={typedJob.id}
                amount={typedJob.price_lkr}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Description ─── */}
      <Card>
        <CardHeader
          title="Description"
          icon={<FileText className="h-4 w-4" />}
        />
        <CardBody>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
            {typedJob.description}
          </p>
        </CardBody>
      </Card>

      {/* ─── Applications ─── */}
      <Card>
        <CardHeader
          title={`Applications (${typedApplications.length})`}
          icon={<Users className="h-4 w-4" />}
          description={
            typedApplications.length > 0
              ? "Review candidates, download resumes, and update their status."
              : undefined
          }
        />
        <CardBody className="p-0">
          {!typedApplications.length ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <Inbox className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  No applications yet
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Applications will appear here as soon as candidates apply.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {typedApplications.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-3 px-4 py-4 transition hover:bg-gray-50/60 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-semibold text-indigo-700">
                      {a.users.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {a.users.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Applied {timeAgo(a.applied_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:gap-3">
                    <ApplicationStatusSelect
                      applicationId={a.id}
                      currentStatus={a.status}
                      onUpdate={updateApplicationStatus.bind(null, typedJob.id)}
                    />
                    <ViewResumeButton applicationId={a.id} />
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