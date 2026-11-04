// src/lib/supabase/admin.ts
import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * DANGER: bypasses RLS. Use only in server-side code after authorization checks
 * where a privileged database operation is required. Never import in client code.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function anonymizeExpiredApplications(
  limit: number
): Promise<Array<{ job_id: string; anonymized: number }>> {
  const { data, error } = await createAdminClient().rpc(
    "anonymize_expired_applications",
    { p_limit: limit }
  );
  if (error) {
    throw new Error(`Could not anonymize expired applications: ${error.message}`);
  }
  return data ?? [];
}

export async function cleanupExpiredTokens(): Promise<{
  deleted_unsubscribe_tokens: number;
  cleared_claim_tokens: number;
  cleared_milestone_tokens: number;
}> {
  const { data, error } = await createAdminClient().rpc("cleanup_expired_tokens");
  if (error) {
    throw new Error(`Could not clean up expired tokens: ${error.message}`);
  }
  const result = data?.[0];
  if (!result) {
    throw new Error("Expired-token cleanup returned no count summary.");
  }
  return result;
}