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
  amount: number;
  currency: string;
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

  const { data: rawPayment, error: paymentLookupError } = await supabase
    .from("payments")
    .select("id, order_id, job_id, status, amount, currency")
    .eq("order_id", payload.order_id)
    .maybeSingle();

  if (paymentLookupError) {
    console.error("[api/payment/notify] payment lookup failed:", paymentLookupError);
    return NextResponse.json({ error: "Payment lookup failed" }, { status: 500 });
  }

  const payment = rawPayment as PaymentRow | null;

  if (!payment) {
    // Webhook for an order we don't know about — ack and move on.
    console.warn(`[api/payment/notify] unknown order ${payload.order_id}`);
    return NextResponse.json({ ok: true });
  }

  const payloadAmount = Number(payload.payhere_amount);
  if (
    !Number.isFinite(payloadAmount) ||
    Number(payment.amount) !== payloadAmount ||
    payment.currency !== payload.payhere_currency
  ) {
    console.error(
      `[api/payment/notify] amount or currency mismatch for order ${payload.order_id}`
    );
    return NextResponse.json(
      { error: "Payment amount or currency mismatch" },
      { status: 400 }
    );
  }

  // Idempotency: don't downgrade a COMPLETED payment.
  if (payment.status === "COMPLETED") {
    if (payment.job_id) {
      const { data: jobState, error: jobLookupError } = await supabase
        .from("jobs")
        .select("status")
        .eq("id", payment.job_id)
        .maybeSingle();

      if (jobLookupError) {
        console.error("[api/payment/notify] job lookup failed:", jobLookupError);
        return NextResponse.json({ error: "Job lookup failed" }, { status: 500 });
      }

      if (jobState?.status === "DRAFT") {
        const { error: jobUpdateError } = await supabase
          .from("jobs")
          .update({ status: "ACTIVE" } as never)
          .eq("id", payment.job_id)
          .eq("status", "DRAFT");

        if (jobUpdateError) {
          console.error("[api/payment/notify] job activation failed:", jobUpdateError);
          return NextResponse.json({ error: "Job activation failed" }, { status: 500 });
        }
      }
    }
    return NextResponse.json({ ok: true, note: "already completed" });
  }

  const success = payload.status_code === SUCCESS_CODE;

  if (success && payment.job_id) {
    const { error: jobUpdateError } = await supabase
      .from("jobs")
      .update({ status: "ACTIVE" } as never)
      .eq("id", payment.job_id)
      .eq("status", "DRAFT");

    if (jobUpdateError) {
      console.error("[api/payment/notify] job activation failed:", jobUpdateError);
      return NextResponse.json({ error: "Job activation failed" }, { status: 500 });
    }
  }

  const { error: paymentUpdateError } = await supabase
    .from("payments")
    .update({
      status: success ? "COMPLETED" : "FAILED",
      gateway_reference: payload.payment_id || null,
    } as never)
    .eq("id", payment.id);

  if (paymentUpdateError) {
    console.error("[api/payment/notify] payment update failed:", paymentUpdateError);
    return NextResponse.json({ error: "Payment update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}