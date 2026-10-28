import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import { JobDetail } from "@/components/jobs/JobDetail";
import type { PublicJobDetail } from "@/types/job";

// ISR — re-rendered at most once every 5 minutes. Publishing or marking a
// job as filled updates `status` on the DB; ISR catches up within the window.
export const revalidate = 300;

type JobDetailRow = PublicJobDetail & { status: string };

type MetadataRow = {
  title: string;
  description: string;
  location: string;
  companies: { company_name: string };
};

// ---------------------------------------------------------------------------
// Cookie-free anon client.
//
// The page MUST NOT call cookies() anywhere (including generateMetadata),
// otherwise Next.js forces the route dynamic and ISR caching is defeated.
// `createClient` from @supabase/supabase-js uses only the anon key and RLS —
// no session, no cookies, no dynamic opt-out.
// ---------------------------------------------------------------------------
const supabase = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata({
  params,
}: {
  params: { jobId: string };
}): Promise<Metadata> {
  const { data } = await supabase
    .from("jobs")
    .select("title, description, location, companies!inner(company_name)")
    .eq("id", params.jobId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  const job = data as unknown as MetadataRow | null;
  if (!job) return { title: "Job not found" };

  return {
    title: `${job.title} at ${job.companies.company_name}`,
    description: job.description.slice(0, 155).replace(/\s+/g, " ").trim(),
    openGraph: {
      title: `${job.title} · ${job.companies.company_name}`,
      description: `${job.location} · ${job.title} at ${job.companies.company_name}`,
      type: "article",
    },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: { jobId: string };
}) {
  const { data } = await supabase
    .from("jobs")
    .select(
      "id, title, description, location, work_type, category, salary_min, salary_max, created_at, last_verified_at, status, companies!inner(company_name, logo_url, description, is_verified)"
    )
    .eq("id", params.jobId)
    .maybeSingle();

  const job = data as unknown as JobDetailRow | null;
  if (!job || job.status !== "ACTIVE") notFound();

  // JSON-LD JobPosting for Google Jobs / rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.created_at,
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.companies.company_name,
      ...(job.companies.logo_url ? { logo: job.companies.logo_url } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: "LK",
      },
    },
    ...(job.salary_min || job.salary_max
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "LKR",
            value: {
              "@type": "QuantitativeValue",
              ...(job.salary_min ? { minValue: job.salary_min } : {}),
              ...(job.salary_max ? { maxValue: job.salary_max } : {}),
              unitText: "MONTH",
            },
          },
        }
      : {}),
    ...(job.last_verified_at
      ? {
          validThrough: new Date(
            new Date(job.last_verified_at).getTime() + 14 * 86400000
          ).toISOString(),
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── Sticky glass header ─── */}
      <header className="sticky top-0 z-40 border-b border-gray-200/60 glass">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm text-white shadow-sm">
              H
            </span>
            <span className="tracking-tight text-gray-900">RealJobs</span>
          </Link>
          <Link
            href="/jobs"
            className="group inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            All jobs
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <JobDetail job={job} />
      </div>
    </div>
  );
}