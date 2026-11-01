import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Building2, FileText, Image as ImageIcon, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CompanyLogoUploader } from "@/components/employer/CompanyLogoUploader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";

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

  // Single atomic upsert — cannot create duplicates, and cannot fail on a
  // double-submit: the second insert hits the unique constraint and updates
  // the existing row instead. Requires the companies_employer_id_key
  // constraint from migration 20261028170000.
  const { error } = await supabase
    .from("companies")
    .upsert(
      {
        employer_id: user.id,
        company_name: name,
        description,
      } as never,
      { onConflict: "employer_id" }
    );

  if (error) {
    redirect(
      "/dashboard/employer/company?error=" + encodeURIComponent(error.message)
    );
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

  const { data, error: companyError } = await supabase
    .from("companies")
    .select("company_name, description, logo_url")
    .eq("employer_id", user!.id)
    .limit(1)
    .maybeSingle();

  if (companyError) {
    console.error("[company page] failed to load company:", companyError);
  }

  const company = data as CompanyRow | null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 sm:space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 sm:gap-2 sm:text-sm">
          <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Employer settings
        </div>
        <h1 className="mt-1 text-balance text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          Company profile
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-gray-500 sm:text-sm">
          This information appears next to every job you post and on your
          public company page.
        </p>
      </div>

      {searchParams.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 sm:px-4 sm:py-3 sm:text-sm">
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
      <form action={saveCompany} className="w-full">
        <Card>
          <CardHeader
            title="Basic information"
            description="Help candidates understand who you are."
            icon={<FileText className="h-5 w-5" />}
          />
          <CardBody className="space-y-4 sm:space-y-5">
            <div className="w-full">
              <label
                htmlFor="company_name"
                className="block text-xs font-medium text-gray-700 sm:text-sm"
              >
                Company name <span className="text-rose-500">*</span>
              </label>
              <input
                id="company_name"
                name="company_name"
                required
                defaultValue={company?.company_name ?? ""}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:px-3.5 sm:text-sm"
                placeholder="Acme (Pvt) Ltd"
              />
            </div>

            <div className="w-full">
              <label
                htmlFor="description"
                className="block text-xs font-medium text-gray-700 sm:text-sm"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={company?.description ?? ""}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base leading-relaxed shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:rows-6 sm:px-3.5 sm:text-sm"
                placeholder="What does your company do? What's the mission? What makes it a great place to work?"
              />
              <p className="mt-1.5 text-[11px] text-gray-500 sm:text-xs">
                Shown on the About section of every job you post. Markdown is
                not supported.
              </p>
            </div>
          </CardBody>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 rounded-b-xl border-t border-gray-100 bg-gray-50/50 px-4 py-3.5 sm:px-6 sm:py-4">
            {/* 
              මොබයිල් එකේදී බටන් එක Full Width කරන්න මේ wrapper එක දැම්මා.
              sm:w-auto එකෙන් ඩෙස්ක්ටොප් එකේදී සාමාන්‍ය ප්‍රමාණයට එනවා.
            */}
            <div className="w-full sm:w-auto">
              <SubmitButton
                pendingText="Saving…"
                fullWidth={true} // මොබයිල් එකේදී සම්පූර්ණ පළල ගන්න
                icon={<Save className="h-4 w-4" />}
              >
                Save profile
              </SubmitButton>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}