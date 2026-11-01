import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import { JobDetail } from "@/components/jobs/JobDetail";
import type { PublicJobDetail } from "@/types/job";
import { Logo } from "@/components/ui/Logo";

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
    // min-h-screen සහ overflow-x-hidden දැම්මා horizontal scroll එක නවත්තන්න
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── Sticky glass header ─── */}
      <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 sm:h-16 sm:px-4">
          <Logo size="sm" />
          <Link
            href="/jobs"
            className="group inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5 sm:h-4 sm:w-4" />
            All jobs
          </Link>
        </div>
      </header>

      {/* 
        ප්‍රධාන කන්ටේනර් එකේ පැඩින් මොබයිල් එකට අඩු කළා:
        px-3 (mobile) -> sm:px-4
        py-6 (mobile) -> sm:py-12
      */}
      <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-4 sm:py-12">
        <JobDetail job={job} />
      </div>
    </div>
  );
}