"use client";

import { useState } from "react";
import { FileText, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";

type State = "idle" | "opening" | "error";

export function ViewResumeButton({
  applicationId,
}: {
  applicationId: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setState("opening");
    setError(null);

    try {
      const res = await fetch("/api/s3/download-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }

      const { url } = (await res.json()) as { url: string };

      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();

      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open resume");
      setState("error");
    }
  }

  // ─── Error state ───
  if (state === "error") {
    return (
      // මොබයිල් එකේදී වම් පැත්තට හරියටම එන්න items-start දැම්මා
      <div className="flex w-full flex-col items-start gap-1.5 sm:w-auto sm:items-end">
        <button
          type="button"
          onClick={() => {
            setState("idle");
            setError(null);
          }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100 sm:w-auto sm:py-1.5"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Retry
        </button>
        {/* Error text එක wrap වෙන්න සහ දිග වැඩි වුණත් කැඩෙන්නේ නැතුව තියෙන්න */}
        <p className="w-full max-w-[250px] break-words text-left text-[10px] leading-tight text-rose-600 sm:text-right">
          {error}
        </p>
      </div>
    );
  }

  // ─── Idle + opening states ───
  const isOpening = state === "opening";

  return (
    <button
      type="button"
      onClick={open}
      disabled={isOpening}
      // මොබයිල් එකේදී w-full, justify-center, min-h-[44px]
      // ඩෙස්ක්ටොප් එකේදී sm:w-auto, sm:min-h-0
      className="group inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-60 sm:min-h-0 sm:w-auto sm:px-2.5 sm:py-1.5"
      aria-label="Open resume in new tab"
    >
      {isOpening ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
          Opening…
        </>
      ) : (
        <>
          <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400 transition group-hover:text-indigo-600" />
          View resume
          <ExternalLink className="h-3 w-3 shrink-0 text-gray-300 transition group-hover:text-indigo-500" />
        </>
      )}
    </button>
  );
}