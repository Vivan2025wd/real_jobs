import "server-only";

import { timingSafeEqual } from "node:crypto";
import { generateNotifyHash } from "./hash";

export function verifyPayHereSignature(payload: {
  merchant_id: string;
  order_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
}): boolean {
  const expected = generateNotifyHash({
    merchantId: payload.merchant_id,
    orderId: payload.order_id,
    amount: payload.payhere_amount,
    currency: payload.payhere_currency,
    statusCode: payload.status_code,
    merchantSecret: process.env.PAYHERE_MERCHANT_SECRET!,
  });

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(payload.md5sig.toUpperCase(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}