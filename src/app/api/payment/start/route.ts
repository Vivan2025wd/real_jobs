import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { generateCheckoutHash } from "@/lib/payhere/hash";

// Listing fee in LKR. In production, read from a config table or env.
const JOB_POSTING_FEE_LKR = "2500.00";
const CURRENCY = "LKR";

// ---------------------------------------------------------------------------
// Explicit row types. Supabase's join inference returns `never` when the
// generated types lack Relationships metadata for the joined table. Casting
// the result to a declared shape is the pragmatic workaround (same pattern as
// employer/jobs/[jobId]/page.tsx). Regenerate types later to remove the casts.
// ---------------------------------------------------------------------------
type JobOwnerCheck = {
  id: string;
  status: "DRAFT" | "ACTIVE" | "FILLED" | "EXPIRED" | "ARCHIVED";
  title: string;
  companies: {
    employer_id: string;
    company_name: string;
  };
};

type ExistingPayment = {
  order_id: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { job_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.job_id) {
    return NextResponse.json({ error: "job_id is required" }, { status: 400 });
  }

  // ---- Fetch job + company (RLS-scoped server client) ----
  const { data: rawJob } = await supabase
    .from("jobs")
    .select("id, status, title, companies!inner(employer_id, company_name)")
    .eq("id", body.job_id)
    .maybeSingle();

  const job = rawJob as JobOwnerCheck | null;

  if (!job || job.companies.employer_id !== user.id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT jobs can be paid for" },
      { status: 400 }
    );
  }

  // ---- Reuse any pending payment for this job, or create one ----
  const { data: rawExisting } = await supabase
    .from("payments")
    .select("order_id, status")
    .eq("job_id", job.id)
    .eq("status", "PENDING")
    .maybeSingle();

  const existing = rawExisting as ExistingPayment | null;
  const orderId = existing?.order_id ?? `ORD-${randomUUID()}`;

  if (!existing) {
    const { error: insertError } = await supabase.from("payments").insert({
      user_id: user.id,
      job_id: job.id,
      order_id: orderId,
      amount: Number(JOB_POSTING_FEE_LKR),
      currency: CURRENCY,
      status: "PENDING",
    } as never);

    if (insertError) {
      console.error("[api/payment/start] insert", insertError);
      return NextResponse.json(
        { error: "Could not create payment record" },
        { status: 500 }
      );
    }
  }

  // ---- Generate checkout hash + response ----
  const merchantId = process.env.PAYHERE_MERCHANT_ID!;
  const hash = generateCheckoutHash({
    merchantId,
    orderId,
    amount: JOB_POSTING_FEE_LKR,
    currency: CURRENCY,
    merchantSecret: process.env.PAYHERE_MERCHANT_SECRET!,
  });

  const sandbox = process.env.PAYHERE_MODE !== "production";

  return NextResponse.json({
    sandbox,
    params: {
      merchant_id: merchantId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/employer/jobs/${job.id}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/employer/jobs/${job.id}?payment=cancelled`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/notify`,
      order_id: orderId,
      items: `Job posting: ${job.title}`.slice(0, 100),
      currency: CURRENCY,
      amount: JOB_POSTING_FEE_LKR,
      first_name: "Employer",
      last_name: job.companies.company_name.slice(0, 50),
      email: user.email!,
      phone: "0000000000",
      address: "Colombo",
      city: "Colombo",
      country: "Sri Lanka",
      hash,
    },
  });
}