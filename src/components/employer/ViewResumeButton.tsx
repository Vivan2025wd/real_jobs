"use client";

import { useState } from "react";

export function ViewResumeButton({ resumeKey }: { resumeKey: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/s3/download-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: resumeKey }),
      });
      if (!res.ok) {
        const { error: msg } = (await res.json()) as { error?: string };
        throw new Error(msg ?? "Could not open resume");
      }
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-60"
      >
        {pending ? "Opening…" : "View resume"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
