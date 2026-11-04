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
  let offset = 0;
  let updated = 0;

  while (true) {
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id")
      .eq("is_system", false)
      .order("id")
      .range(offset, offset + 499);

    if (error) throw new Error(`Could not load companies: ${error.message}`);
    if (!companies?.length) break;

    for (const company of companies) {
      const { count, error: countError } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .neq("status", "DRAFT");
      if (countError) {
        throw new Error(`Could not count jobs for company ${company.id}: ${countError.message}`);
      }

      const { error: updateError } = await supabase
        .from("companies")
        .update({ free_jobs_used: Math.min(count ?? 0, 2) })
        .eq("id", company.id);
      if (updateError) {
        throw new Error(`Could not update company ${company.id}: ${updateError.message}`);
      }
      updated++;
    }

    if (companies.length < 500) break;
    offset += companies.length;
  }

  console.info(`Updated free-job usage for ${updated} companies.`);
}

main().catch((error: unknown) => {
  console.error("[backfill_free_jobs] failed:", error);
  process.exitCode = 1;
});
