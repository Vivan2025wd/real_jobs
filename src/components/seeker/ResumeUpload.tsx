"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setPending(true);
    setMessage(null);

    try {
      // TODO Phase 2: replace with /api/s3/presigned-url + direct S3 PUT
      await new Promise((r) => setTimeout(r, 800));
      setMessage("Upload endpoint not wired yet — coming in Phase 2 with AWS S3.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
      />
      {message && <p className="text-sm text-gray-600">{message}</p>}
      <Button onClick={handleUpload} disabled={!file || pending}>
        {pending ? "Uploading…" : "Upload resume"}
      </Button>
    </div>
  );
}