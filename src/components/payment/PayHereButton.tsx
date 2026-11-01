"use client";

import { useState } from "react";
import {
  CreditCard,
  Lock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

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
    // Wrapper එකට w-full දැම්මා, space-y-2.5 මොබයිල් එකට ගැලපෙන විදියට ටිකක් අඩු කළා
    <div className="w-full space-y-2 sm:space-y-2.5">
      <Button
        onClick={startPayment}
        disabled={pending}
        size="lg"
        // justify-center දැම්මා, එතකොට බටන් එකේ අකුරු හරියටම මැදට එනවා
        className="w-full justify-center sm:w-auto"
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

      {/* Trust line - මොබයිල් එකේදී අකුරු ටිකක් පොඩියට (text-[10px]) කළා */}
      <p className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 sm:justify-start sm:text-[11px]">
        <Lock className="h-2.5 w-2.5 text-gray-400 sm:h-3 sm:w-3" />
        Secured by PayHere
      </p>

      {/* Error state - පැඩින් සහ අකුරු මොබයිල් එකට හරියටම හැඩගැහුවා */}
      {error && (
        <div className="flex w-full items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 sm:gap-2.5 sm:px-3 sm:py-3">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 sm:h-6 sm:w-6">
            <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-rose-900 sm:text-xs">
              Payment didn&apos;t start
            </p>
            <p className="mt-0.5 break-words text-[10px] leading-relaxed text-rose-700 sm:text-[11px]">
              {error}
            </p>
            <p className="mt-1 text-[10px] text-rose-500 sm:text-[11px]">
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