import { z } from "zod";

export const JOB_CATEGORIES = [
  "ENGINEERING",
  "DESIGN",
  "MARKETING",
  "SALES",
  "CUSTOMER_SUPPORT",
  "FINANCE",
  "OPERATIONS",
  "HR",
  "OTHER",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const jobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().min(30, "Describe the role in at least 30 characters"),
  location: z.string().min(2, "Location is required"),
  work_type: z.enum(["REMOTE", "ONSITE", "HYBRID"]),
  category: z.enum(JOB_CATEGORIES).nullable().optional(),
  salary_min: z.coerce.number().int().nonnegative().nullable().optional(),
  salary_max: z.coerce.number().int().nonnegative().nullable().optional(),
  duration_days: z.coerce
    .number()
    .int()
    .refine((n) => [7, 14, 30].includes(n), {
      message: "Duration must be 7, 14, or 30 days",
    })
    .default(14),   // ← NEW
}).refine(
  (v) => v.salary_min == null || v.salary_max == null || v.salary_min <= v.salary_max,
  { message: "Minimum salary cannot exceed maximum", path: ["salary_max"] }
);

export type JobInput = z.infer<typeof jobSchema>;

export const CATEGORY_SLUGS: Record<string, JobCategory> = {
  engineering: "ENGINEERING",
  design: "DESIGN",
  marketing: "MARKETING",
  sales: "SALES",
  "customer-support": "CUSTOMER_SUPPORT",
  finance: "FINANCE",
  operations: "OPERATIONS",
  hr: "HR",
  other: "OTHER",
};

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  ENGINEERING: "Engineering",
  DESIGN: "Design",
  MARKETING: "Marketing",
  SALES: "Sales",
  CUSTOMER_SUPPORT: "Customer Support",
  FINANCE: "Finance",
  OPERATIONS: "Operations",
  HR: "HR",
  OTHER: "Other",
};