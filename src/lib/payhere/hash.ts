import "server-only";

import { createHash } from "node:crypto";

function md5Upper(input: string): string {
  return createHash("md5").update(input).digest("hex").toUpperCase();
}

/**
 * Checkout hash — passed to the client to start the PayHere payment popup.
 *   MD5(merchant_id + order_id + amount + currency + uppercase(MD5(secret)))
 */
export function generateCheckoutHash({
  merchantId,
  orderId,
  amount,
  currency,
  merchantSecret,
}: {
  merchantId: string;
  orderId: string;
  amount: string;
  currency: string;
  merchantSecret: string;
}): string {
  const secretHash = md5Upper(merchantSecret);
  return md5Upper(merchantId + orderId + amount + currency + secretHash);
}

/**
 * Notification hash — the `md5sig` field PayHere sends to the webhook.
 *   MD5(merchant_id + order_id + amount + currency + status_code + uppercase(MD5(secret)))
 */
export function generateNotifyHash({
  merchantId,
  orderId,
  amount,
  currency,
  statusCode,
  merchantSecret,
}: {
  merchantId: string;
  orderId: string;
  amount: string;
  currency: string;
  statusCode: string;
  merchantSecret: string;
}): string {
  const secretHash = md5Upper(merchantSecret);
  return md5Upper(
    merchantId + orderId + amount + currency + statusCode + secretHash
  );
}