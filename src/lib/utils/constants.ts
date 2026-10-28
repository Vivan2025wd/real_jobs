// src/lib/utils/constants.ts

// ─── Pricing ─────────────────────────────────────────────────────────────
export const PAYMENT_CURRENCY = "LKR";

export const JOB_POSTING_PRICES: Record<7 | 14 | 30, number> = {
  7: 2499,
  14: 4499,
  30: 8499,
};

export const DURATION_OPTIONS = [7, 14, 30] as const;
export type DurationDays = (typeof DURATION_OPTIONS)[number];

export function priceForDuration(days: number): number {
  const normalized: DurationDays = ([7, 14, 30] as const).includes(
    days as DurationDays
  )
    ? (days as DurationDays)
    : 14;
  return JOB_POSTING_PRICES[normalized];
}

export function formatPriceLKR(amount: number): string {
  return `LKR ${amount.toLocaleString("en-LK")}`;
}

export function formatPriceForGateway(amount: number): string {
  return amount.toFixed(2);
}