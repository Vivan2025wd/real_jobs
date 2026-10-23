"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// The PayHere checkout object is a mix of string fields (params from the
// server) and one boolean (`sandbox`). Using Record<string, string> for the
// whole thing would force `sandbox` to be a string — instead, define the
// exact accepted shape as a union-index record.
type PayHereParams = Record<string, string>;

type PayHereWindow = Window & {
  payhere?: {
    startPayment: (
      payment: PayHereParams & { sandbox: boolean }
    ) => void;
    onCompleted?: (orderId: string) => void;
    onDismissed?: () => void;
    onError?: (error: string) => void;
  };
};

export function PayHereButton({ jobId }: { jobId: string }) {
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

      // `sandbox` is a boolean; everything else comes from `params` as strings.
      // The cast is required because the SDK's accepted shape is broader than
      // what TypeScript can express via a single index signature.
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
    <div className="space-y-2">
      <Button onClick={startPayment} disabled={pending}>
        {pending ? "Opening PayHere…" : "Pay LKR 2,500 & publish"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
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