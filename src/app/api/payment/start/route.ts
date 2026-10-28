// src/app/api/payment/start/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { generateCheckoutHash } from "@/lib/payhere/hash";
import { formatPriceForGateway } from "@/lib/utils/constants";

const CURRENCY = "LKR";

type JobOwnerCheck = {
  id: string;
  status: "DRAFT" | "ACTIVE" | "FILLED" | "EXPIRED" | "ARCHIVED";
  title: string;
  duration_days: number;
  price_lkr: number;
  companies: { employer_id: string; company_name: string };
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

  // ─── Load job + verify ownership ───
  const { data } = await supabase
    .from("jobs")
    .select(
      "id, status, title, duration_days, price_lkr, companies!inner(employer_id, company_name)"
    )
    .eq("id", body.job_id)
    .returns<JobOwnerCheck>()
    .maybeSingle();

  const job = data as unknown as JobOwnerCheck | null;

  if (!job || job.companies.employer_id !== user.id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT jobs can be paid for" },
      { status: 400 }
    );
  }

  // ─── Use the price locked at creation time ───
  const amount = formatPriceForGateway(job.price_lkr);

  // ─── Prevent duplicate pending payments (reuse order_id if pending) ───
  const { data: existing } = await supabase
    .from("payments")
    .select("order_id, status, amount")
    .eq("job_id", job.id)
    .eq("status", "PENDING")
    .maybeSingle();

  const existingPayment = existing as
    | { order_id: string; status: string; amount: number }
    | null;

  let orderId = existingPayment?.order_id ?? `ORD-${randomUUID()}`;

  // If amount changed (shouldn't happen with locked price, but defensive),
  // abandon the old pending payment and create a new one
  if (existingPayment && Number(existingPayment.amount) !== job.price_lkr) {
    await supabase
      .from("payments")
      .update({ status: "FAILED" } as never)
      .eq("order_id", existingPayment.order_id);
    orderId = `ORD-${randomUUID()}`;
  }

  if (!existingPayment || Number(existingPayment.amount) !== job.price_lkr) {
    const { error: insertError } = await supabase.from("payments").insert({
      user_id: user.id,
      job_id: job.id,
      order_id: orderId,
      amount: job.price_lkr,
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

  // ─── Sign the PayHere checkout ───
  const merchantId = process.env.PAYHERE_MERCHANT_ID!;
  const hash = generateCheckoutHash({
    merchantId,
    orderId,
    amount,
    currency: CURRENCY,
    merchantSecret: process.env.PAYHERE_MERCHANT_SECRET!,
  });

  const sandbox = process.env.PAYHERE_MODE !== "production";
  const action = sandbox
    ? "https://sandbox.payhere.lk/pay/checkout"
    : "https://www.payhere.lk/pay/checkout";

  return NextResponse.json({
    action,
    sandbox,
    amount: job.price_lkr,
    params: {
      merchant_id: merchantId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/employer/jobs/${job.id}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/employer/jobs/${job.id}?payment=cancelled`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/notify`,
      order_id: orderId,
      items: `Job posting: ${job.title} (${job.duration_days} days)`.slice(0, 100),
      currency: CURRENCY,
      amount,
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