import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPayHereSignature } from "@/lib/payhere/verify";

// ---------------------------------------------------------------------------
// Explicit row type. Supabase's join inference returns `never` when the
// generated types lack Relationships metadata. Casting the result to a
// declared shape is the pragmatic workaround used elsewhere in this project.
// ---------------------------------------------------------------------------
type PaymentRow = {
  id: string;
  order_id: string;
  job_id: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
};

// PayHere status codes:
//   2 = success, 0 = pending, -1 = cancelled, -2 = failed, -3 = chargedback
const SUCCESS_CODE = "2";

export async function POST(req: NextRequest) {
  // PayHere posts application/x-www-form-urlencoded
  const text = await req.text();
  const params = new URLSearchParams(text);

  const payload = {
    merchant_id: params.get("merchant_id") ?? "",
    order_id: params.get("order_id") ?? "",
    payhere_amount: params.get("payhere_amount") ?? "",
    payhere_currency: params.get("payhere_currency") ?? "",
    status_code: params.get("status_code") ?? "",
    md5sig: params.get("md5sig") ?? "",
    payment_id: params.get("payment_id") ?? "",
  };

  if (!payload.order_id || !payload.md5sig) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (payload.merchant_id !== process.env.PAYHERE_MERCHANT_ID) {
    return NextResponse.json({ error: "Merchant mismatch" }, { status: 400 });
  }

  if (!verifyPayHereSignature(payload)) {
    console.warn(
      `[api/payment/notify] signature mismatch for order ${payload.order_id}`
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: rawPayment } = await supabase
    .from("payments")
    .select("id, order_id, job_id, status")
    .eq("order_id", payload.order_id)
    .maybeSingle();

  const payment = rawPayment as PaymentRow | null;

  if (!payment) {
    // Webhook for an order we don't know about — ack and move on.
    console.warn(`[api/payment/notify] unknown order ${payload.order_id}`);
    return NextResponse.json({ ok: true });
  }

  // Idempotency: don't downgrade a COMPLETED payment.
  if (payment.status === "COMPLETED") {
    return NextResponse.json({ ok: true, note: "already completed" });
  }

  const success = payload.status_code === SUCCESS_CODE;

  await supabase
    .from("payments")
    .update({
      status: success ? "COMPLETED" : "FAILED",
      gateway_reference: payload.payment_id || null,
    } as never)
    .eq("id", payment.id);

  if (success && payment.job_id) {
    await supabase
      .from("jobs")
      .update({ status: "ACTIVE" } as never)
      .eq("id", payment.job_id)
      .eq("status", "DRAFT");
  }

  return NextResponse.json({ ok: true });
}