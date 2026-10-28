import Link from "next/link";
import { redirect } from "next/navigation";
import {
  User,
  Mail,
  FileText,
  CheckCircle2,
  Info,
  ShieldCheck,
  Lock,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ResumeUpload } from "@/components/seeker/ResumeUpload";
import { Button } from "@/components/ui/Button";
import type { SeekerProfile } from "@/types/user";

export default async function SeekerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("resume_url")
    .eq("id", user.id)
    .returns<Pick<SeekerProfile, "resume_url">>()
    .maybeSingle();

  const initialUrl =
    (profile as Pick<SeekerProfile, "resume_url"> | null)?.resume_url ?? null;

  const hasResume = !!initialUrl;
  const initial = user.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ─── Identity header ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-indigo-50/40 p-4 shadow-card sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-violet-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white shadow-md">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl text-balance">
                  Profile &amp; resume
                </h1>
                {hasResume && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    Ready to apply
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-gray-500">
                {user.email}
              </p>
            </div>
          </div>

          {hasResume && (
            <Link href="/jobs" className="shrink-0">
              <Button
                variant="secondary"
                iconRight={<ArrowRight className="h-4 w-4" />}
              >
                Browse jobs
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ─── Missing-resume warning ─── */}
      {!hasResume && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-amber-900">
              Upload a resume to apply
            </p>
            <p className="mt-0.5 text-sm text-amber-800">
              Employers see your resume when you apply. Without one, you
              won&apos;t be able to submit job applications.
            </p>
          </div>
        </div>
      )}

      {/* ─── Account ─── */}
      <Card>
        <CardHeader
          title="Account"
          description="Your sign-in identity on RealJobs."
          icon={<User className="h-4 w-4" />}
        />
        <CardBody>
          <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm ring-1 ring-gray-100">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Email address</p>
              <p className="truncate font-medium text-gray-900">
                {user.email}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ─── Resume ─── */}
      <Card>
        <CardHeader
          title="Resume"
          description="PDF only · max 5 MB · attached to every application"
          icon={<FileText className="h-4 w-4" />}
        />
        <CardBody>
          <ResumeUpload initialUrl={initialUrl} />
        </CardBody>
      </Card>

      {/* ─── Privacy & usage ─── */}
      <Card>
        <CardHeader
          title="How your resume is used"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <CardBody className="p-0">
          <ul className="divide-y divide-gray-100">
            {[
              {
                icon: RefreshCw,
                title: "Auto-attached to applications",
                body: "Every time you apply to a role, your resume is included automatically. No re-uploading.",
              },
              {
                icon: Lock,
                title: "Private by default",
                body: "Only employers whose jobs you apply to can view your resume. It is never publicly listed.",
              },
              {
                icon: FileText,
                title: "Replace anytime",
                body: "Upload a new version whenever you update it. Changes apply to future applications.",
              },
            ].map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-3 px-6 py-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}