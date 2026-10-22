// src/lib/supabase/admin.ts
import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * DANGER: bypasses RLS. Only use in:
 *   - /api/payment/notify  (PayHere webhook)
 *   - /api/cron/*          (cron jobs)
 * Never import this in a Client Component or a page that renders user content.
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