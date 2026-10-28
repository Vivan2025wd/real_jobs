"use client";

import { useState } from "react";
import {
  CreditCard,
  Lock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// The PayHere checkout object is a mix of string fields (params from the
// server) and one boolean (`sandbox`). Using Record<string, string> for the
// whole thing would force `sandbox` to be a string — instead, define the
// exact accepted shape as a union-index record.
// ---------------------------------------------------------------------------
type PayHereParams = Record<string, string>;

type PayHereWindow = Window & {
  payhere?: {
    startPayment: (payment: PayHereParams & { sandbox: boolean }) => void;
    onCompleted?: (orderId: string) => void;
    onDismissed?: () => void;
    onError?: (error: string) => void;
  };
};

export function PayHereButton({
  jobId,
  amount,
}: {
  jobId: string;
  amount: number;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startPayment() {
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/payment/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not start payment");
      }

      const { sandbox, params } = (await res.json()) as {
        sandbox: boolean;
        params: PayHereParams;
      };

      await loadPayHereSdk();
      const w = window as PayHereWindow;
      if (!w.payhere) throw new Error("PayHere SDK failed to load");

      w.payhere.onCompleted = () => {
        window.location.href = `/dashboard/employer/jobs/${jobId}?payment=success`;
      };
      w.payhere.onDismissed = () => {
        setPending(false);
      };
      w.payhere.onError = (err: string) => {
        setError(err);
        setPending(false);
      };

      w.payhere.startPayment({
        ...params,
        sandbox,
      } as PayHereParams & { sandbox: boolean });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <Button
        onClick={startPayment}
        disabled={pending}
        size="lg"
        icon={
          pending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )
        }
      >
        {pending
          ? "Opening PayHere…"
          : `Pay LKR ${amount.toLocaleString("en-LK")} & publish`}
      </Button>

      {/* Trust line — a lock icon is the universal "safe" signal */}
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 sm:justify-start">
        <Lock className="h-2.5 w-2.5 text-gray-400" />
        Secured by PayHere
      </p>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertCircle className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-rose-900">
              Payment didn&apos;t start
            </p>
            <p className="mt-0.5 break-words text-[11px] leading-relaxed text-rose-700">
              {error}
            </p>
            <p className="mt-1 text-[11px] text-rose-500">
              Click the button to retry.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

let payhereLoading: Promise<void> | null = null;

function loadPayHereSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as PayHereWindow;
  if (w.payhere) return Promise.resolve();
  if (payhereLoading) return payhereLoading;

  payhereLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.payhere.lk/lib/payhere.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Could not load PayHere SDK"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.payhere.lk/lib/payhere.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load PayHere SDK"));
    document.body.appendChild(script);
  });

  return payhereLoading;
}