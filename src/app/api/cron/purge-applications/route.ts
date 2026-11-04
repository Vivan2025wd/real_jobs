import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { anonymizeExpiredApplications } from "@/lib/supabase/admin";

export const maxDuration = 60;

const BATCH_SIZE = 50;
const STOP_BEFORE_TIMEOUT_MS = 45_000;

function unauthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return true;

  const actual = Buffer.from(header);
  const expected = Buffer.from("Bearer ".concat(secret));
  return actual.length !== expected.length || !timingSafeEqual(actual, expected);
}

export async function GET(request: NextRequest) {
  if (unauthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const details: Array<{ job_id: string; anonymized: number }> = [];

  try {
    while (Date.now() - startedAt < STOP_BEFORE_TIMEOUT_MS) {
      const batch = await anonymizeExpiredApplications(BATCH_SIZE);
      if (batch.length === 0) {
        console.info(
          `[cron:purge-applications] anonymized ${details.reduce((total, item) => total + item.anonymized, 0)} applications across ${details.length} jobs`
        );
        return NextResponse.json({ ok: true, processed: details.length, details });
      }
      details.push(...batch);
    }

    console.error("[cron:purge-applications] stopped before draining all batches");
    return NextResponse.json(
      { ok: false, error: "Batch processing incomplete; run the cron again", processed: details.length },
      { status: 500 }
    );
  } catch (error) {
    console.error("[cron:purge-applications] processing failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processed: details.length,
      },
      { status: 500 }
    );
  }
}
