import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ResumeUpload } from "@/components/seeker/ResumeUpload";
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Profile &amp; resume
        </h1>
        <p className="text-gray-500">
          Your resume is attached to every job application.
        </p>
      </div>

      <Card>
        <CardHeader title="Account" />
        <CardBody>
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium text-gray-900">{user.email}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Resume" description="PDF only, max 5 MB." />
        <CardBody>
          <ResumeUpload initialUrl={initialUrl} />
        </CardBody>
      </Card>
    </div>
  );
}