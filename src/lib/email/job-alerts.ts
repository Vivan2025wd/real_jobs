import type { JobSearchFilters } from "@/lib/jobs/search";
import { summarizeJobSearch } from "@/lib/jobs/search";

export type AlertJob = {
  id: string;
  title: string;
  location: string;
  work_type: string;
  salary_min: number | null;
  salary_max: number | null;
  companies: { company_name: string; logo_url: string | null };
};

export type JobAlertSection = {
  filters: JobSearchFilters;
  unsubscribeToken: string;
  jobs: AlertJob[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function searchUrl(filters: JobSearchFilters, appUrl: string): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return `${appUrl}/jobs?${params.toString()}`;
}

export function buildJobAlertEmail(sections: JobAlertSection[]): {
  subject: string;
  html: string;
  headers: Record<string, string>;
} {
  const appUrl = getAppUrl();
  const firstUnsubscribeUrl = `${appUrl}/api/alerts/unsubscribe?token=${encodeURIComponent(
    sections[0].unsubscribeToken
  )}`;

  const body = sections
    .map((section) => {
      const resultsUrl = searchUrl(section.filters, appUrl);
      const unsubscribeUrl = `${appUrl}/alerts/unsubscribe?token=${encodeURIComponent(
        section.unsubscribeToken
      )}`;
      const jobs = section.jobs
        .slice(0, 10)
        .map((job) => {
          const salary =
            job.salary_min || job.salary_max
              ? ` · LKR ${job.salary_min?.toLocaleString() ?? "—"}–${job.salary_max?.toLocaleString() ?? "—"}`
              : "";
          return `<li style="padding:12px 0;border-bottom:1px solid #e5e7eb">
            <a href="${appUrl}/jobs/${encodeURIComponent(job.id)}" style="color:#4338ca;font-weight:600;text-decoration:none">${escapeHtml(job.title)}</a>
            <div style="margin-top:4px;color:#6b7280;font-size:13px">${escapeHtml(job.companies.company_name)} · ${escapeHtml(job.location)} · ${escapeHtml(job.work_type)}${salary}</div>
          </li>`;
        })
        .join("");

      return `<section style="margin:24px 0;padding:20px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="margin:0;color:#111827;font-size:17px">New jobs for ${escapeHtml(
          summarizeJobSearch(section.filters)
        )}</h2>
        <ul style="margin:12px 0 0;padding:0;list-style:none">${jobs}</ul>
        <p style="margin:16px 0 0"><a href="${resultsUrl}" style="color:#4338ca;font-weight:600">See more matching jobs</a></p>
        <p style="margin:12px 0 0;font-size:12px"><a href="${unsubscribeUrl}" style="color:#6b7280">Unsubscribe from this search</a></p>
      </section>`;
    })
    .join("");

  return {
    subject: "New jobs match your saved searches",
    html: `<div style="max-width:640px;margin:0 auto;padding:24px;font-family:Arial,sans-serif;color:#111827">
      <h1 style="font-size:22px">New jobs on RealJobs.lk</h1>
      <p style="color:#4b5563">Here are new active jobs matching your saved searches.</p>
      ${body}
      <p style="margin-top:28px;color:#6b7280;font-size:12px">You are receiving this email because you saved a job search on RealJobs.lk.</p>
    </div>`,
    headers: {
      "List-Unsubscribe": `<${firstUnsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
