// src/types/payment.ts
//
// Payment domain types. Covers:
//   * the `payments` table row
//   * the PayHere checkout parameters returned by /api/payment/start
//   * the PayHere notification payload posted to /api/payment/notify

// ---------------------------------------------------------------------------
// Table row
// ---------------------------------------------------------------------------
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

export type PaymentRow = {
  id: string;
  user_id: string;
  job_id: string | null;
  order_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway_reference: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// PayHere checkout
// ---------------------------------------------------------------------------
/**
 * Parameters passed to `payhere.startPayment(...)` on the client.
 * The hash is generated server-side; the client never sees the merchant
 * secret.
 */
export type PayHereCheckoutParams = {
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  currency: string;
  amount: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  hash: string;
};

/**
 * Response shape from POST /api/payment/start.
 * `action` is the PayHere checkout URL (sandbox or live).
 */
export type PayHereInitResponse = {
  action: string;
  params: PayHereCheckoutParams;
};

// ---------------------------------------------------------------------------
// PayHere notification (webhook) payload
// ---------------------------------------------------------------------------
/**
 * The webhook posts `application/x-www-form-urlencoded`. Every field arrives
 * as a string; `payhere_amount` uses 2-decimal formatting ("2500.00").
 */
export type PayHereNotifyPayload = {
  merchant_id: string;
  order_id: string;
  payment_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: PayHereStatusCode;
  md5sig: string;
  method?: string;
  status_message?: string;
  card_holder_name?: string;
  card_no?: string;
  card_expiry?: string;
  custom_1?: string;
  custom_2?: string;
};

/**
 * PayHere status codes, per their documentation.
 * Only `"2"` means the payment succeeded.
 */
export type PayHereStatusCode =
  | "2" // success
  | "0" // pending
  | "-1" // canceled
  | "-2" // failed
  | "-3"; // chargeback

export const PAYHERE_SUCCESS_CODE: PayHereStatusCode = "2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return value === "PENDING" || value === "COMPLETED" || value === "FAILED";
}

export { JOB_POSTING_FEE_LKR, PAYMENT_CURRENCY } from "@/lib/utils/constants";