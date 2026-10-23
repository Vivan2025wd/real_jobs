import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Company profile</h1>
      <p className="mt-1 text-gray-500">
        This information appears next to your job posts.
      </p>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {searchParams.error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {searchParams.error}
          </div>
        )}

        <form action={saveCompany} className="space-y-5">
          <div>
            <label
              htmlFor="company_name"
              className="block text-sm font-medium text-gray-700"
            >
              Company name
            </label>
            <input
              id="company_name"
              name="company_name"
              required
              defaultValue={company?.company_name ?? ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              rows={5}
              defaultValue={company?.description ?? ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="What does your company do?"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save profile
          </button>
        </form>
      </div>
    </div>
  );
}