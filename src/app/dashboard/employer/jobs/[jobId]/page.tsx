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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

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

  const app = updatedApp as unknown as {
    users: { email: string };
    jobs: { title: string; companies: { company_name: string } };
  };

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

    const escapedJobTitle = escapeHtml(app.jobs.title);
    const escapedCompanyName = escapeHtml(app.jobs.companies.company_name);

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
              Your application for <strong>${escapedJobTitle}</strong> at
              <strong>${escapedCompanyName}</strong> has been updated.
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
    <div className="w-full space-y-4 sm:space-y-6">
      {/* ─── Payment banners ─── */}
      {searchParams.payment === "success" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm sm:gap-3 sm:px-4 sm:py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 sm:h-8 sm:w-8">
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900 sm:text-base">
              Payment received
            </p>
            <p className="mt-0.5 text-xs leading-snug text-emerald-800 sm:text-sm">
              We&apos;re confirming with PayHere now. If the status below still
              shows <strong>Draft</strong>, refresh in a few seconds — the
              webhook activates the job automatically.
            </p>
          </div>
        </div>
      )}
      {searchParams.payment === "cancelled" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm sm:gap-3 sm:px-4 sm:py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 sm:h-8 sm:w-8">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 sm:text-base">
              Payment cancelled
            </p>
            <p className="mt-0.5 text-xs leading-snug text-amber-800 sm:text-sm">
              You can try again below whenever you&apos;re ready.
            </p>
          </div>
        </div>
      )}

      {/* ─── Header card ─── */}
      <div className="w-full rounded-xl border border-gray-200 bg-white p-3.5 shadow-card sm:rounded-2xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-balance text-lg font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">
                {typedJob.title}
              </h1>
              <StatusBadge status={typedJob.status} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-600 sm:mt-3 sm:gap-x-5 sm:gap-y-2 sm:text-sm">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-gray-400 sm:h-4 sm:w-4" />
                {typedJob.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5 text-gray-400 sm:h-4 sm:w-4" />
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

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:mt-3 sm:gap-x-4 sm:text-xs">
              <span className="inline-flex items-center gap-1 text-gray-400">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Posted {formatDate(typedJob.created_at)}
              </span>
              {typedJob.last_verified_at && (
                <span className="inline-flex items-center gap-1 text-gray-400">
                  <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Last verified {timeAgo(typedJob.last_verified_at)}
                </span>
              )}
              {typedJob.status === "ACTIVE" && typedJob.expires_at && (
                <ExpiryCountdown expiresAt={typedJob.expires_at} />
              )}
            </div>
          </div>

          {/* Edit Button - Full width on mobile */}
          <div className="w-full sm:w-auto sm:shrink-0">
            <Link href={`/dashboard/employer/jobs/${typedJob.id}/edit`} className="block w-full">
              <Button variant="secondary" icon={<Edit3 className="h-4 w-4" />} className="w-full justify-center sm:w-auto">
                Edit
              </Button>
            </Link>
          </div>
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
        <div className="relative w-full overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 shadow-card sm:rounded-2xl sm:p-6">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-200/30 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-xl">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                  Ready to publish?
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-600 sm:text-sm">
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
          <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700 sm:text-sm">
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
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center sm:px-6 sm:py-14">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 sm:h-12 sm:w-12">
                <Inbox className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 sm:text-base">
                  No applications yet
                </p>
                <p className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
                  Applications will appear here as soon as candidates apply.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {typedApplications.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-2.5 px-3 py-3.5 transition hover:bg-gray-50/60 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4"
                >
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-semibold text-indigo-700 sm:h-10 sm:w-10 sm:text-sm">
                      {a.users.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 sm:text-base">
                        {a.users.email}
                      </p>
                      <p className="text-[10px] text-gray-500 sm:text-xs">
                        Applied {timeAgo(a.applied_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 pl-10 sm:w-auto sm:shrink-0 sm:gap-3 sm:pl-0">
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