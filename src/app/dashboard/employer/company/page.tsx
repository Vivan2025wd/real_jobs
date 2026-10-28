import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Building2, FileText, Image as ImageIcon, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CompanyLogoUploader } from "@/components/employer/CompanyLogoUploader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

type CompanyRow = {
  company_name: string;
  description: string | null;
  logo_url: string | null;
};

async function saveCompany(formData: FormData) {
  "use server";

  const name = String(formData.get("company_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) {
    redirect(
      "/dashboard/employer/company?error=" +
        encodeURIComponent("Company name is required.")
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("employer_id", user.id)
    .maybeSingle();

  const existingId = (existing as { id: string } | null)?.id;

  if (existingId) {
    await supabase
      .from("companies")
      .update({ company_name: name, description } as never)
      .eq("id", existingId);
  } else {
    await supabase
      .from("companies")
      .insert({ employer_id: user.id, company_name: name, description } as never);
  }

  revalidatePath("/dashboard/employer/company");
  revalidatePath("/dashboard/employer");
  redirect("/dashboard/employer");
}

export default async function CompanySettingsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("companies")
    .select("company_name, description, logo_url")
    .eq("employer_id", user!.id)
    .maybeSingle();

  const company = data as CompanyRow | null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
          <Building2 className="h-4 w-4" />
          Employer settings
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl text-balance">
          Company profile
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          This information appears next to every job you post and on your
          public company page.
        </p>
      </div>

      {searchParams.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {searchParams.error}
        </div>
      )}

      {/* Logo card */}
      <Card>
        <CardHeader
          title="Company logo"
          description="Shown next to your job listings. PNG, JPEG, or WebP. Max 2 MB."
          icon={<ImageIcon className="h-5 w-5" />}
        />
        <CardBody>
          <CompanyLogoUploader initialUrl={company?.logo_url ?? null} />
        </CardBody>
      </Card>

      {/* Basic info card */}
      <form action={saveCompany}>
        <Card>
          <CardHeader
            title="Basic information"
            description="Help candidates understand who you are."
            icon={<FileText className="h-5 w-5" />}
          />
          <CardBody className="space-y-5">
            <div>
              <label
                htmlFor="company_name"
                className="block text-sm font-medium text-gray-700"
              >
                Company name <span className="text-rose-500">*</span>
              </label>
              <input
                id="company_name"
                name="company_name"
                required
                defaultValue={company?.company_name ?? ""}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base sm:text-sm shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Acme (Pvt) Ltd"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={6}
                defaultValue={company?.description ?? ""}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base sm:text-sm leading-relaxed shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="What does your company do? What's the mission? What makes it a great place to work?"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Shown on the About section of every job you post. Markdown is
                not supported.
              </p>
            </div>
          </CardBody>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <Save className="h-4 w-4" />
              Save changes
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}