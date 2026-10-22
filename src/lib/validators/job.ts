import { z } from "zod";

export const jobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().min(30, "Describe the role in at least 30 characters"),
  location: z.string().min(2, "Location is required"),
  work_type: z.enum(["REMOTE", "ONSITE", "HYBRID"]),
  salary_min: z.coerce.number().int().nonnegative().nullable().optional(),
  salary_max: z.coerce.number().int().nonnegative().nullable().optional(),
}).refine(
  (v) => v.salary_min == null || v.salary_max == null || v.salary_min <= v.salary_max,
  { message: "Minimum salary cannot exceed maximum", path: ["salary_max"] }
);

export type JobInput = z.infer<typeof jobSchema>;