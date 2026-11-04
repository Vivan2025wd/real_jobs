#!/usr/bin/env tsx
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase URL and service role key are required.");
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const now = Date.now();
  const minimumPurgeAt = now + 7 * 86_400_000;
  let updated = 0;

  while (true) {
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("id, duration_days, source, claimed_at, expires_at")
      .in("status", ["EXPIRED", "CLOSED", "FILLED", "ARCHIVED"])
      .is("applications_purge_at", null)
      .order("id")
      .range(0, 499);

    if (error) throw new Error(`Could not load ended jobs: ${error.message}`);
    if (!jobs?.length) break;

    for (const job of jobs) {
      const retainDays =
        job.source === "EXTERNAL" && !job.claimed_at ? 30 : job.duration_days;
      const retentionStart = Math.min(now, new Date(job.expires_at).getTime());
      const purgeAt = new Date(
        Math.max(minimumPurgeAt, retentionStart + retainDays * 86_400_000)
      ).toISOString();

      const { error: updateError } = await supabase
        .from("jobs")
        .update({ applications_purge_at: purgeAt })
        .eq("id", job.id)
        .is("applications_purge_at", null);
      if (updateError) {
        throw new Error(`Could not set purge time for job ${job.id}: ${updateError.message}`);
      }
      updated++;
    }
  }

  console.info(`Set application-data retention dates for ${updated} jobs.`);
}

main().catch((error: unknown) => {
  console.error("[backfill_purge_at] failed:", error);
  process.exitCode = 1;
});
