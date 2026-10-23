"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const MAX_SIZE_MB = 5;

export function ResumeUpload({ initialUrl }: { initialUrl: string | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);

  async function handleUpload() {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB} MB.`);
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Ask the server for a pre-signed URL
      const presignRes = await fetch("/api/s3/presigned-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purpose: "RESUME",
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!presignRes.ok) {
        const { error: msg } = (await presignRes.json()) as { error?: string };
        throw new Error(msg ?? "Could not prepare upload");
      }

      const { uploadUrl, key } = (await presignRes.json()) as {
        uploadUrl: string;
        key: string;
      };

      // 2. Upload directly to S3
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error("Upload to storage failed");
      }

      // 3. Save the key against the user profile
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired — please sign in again");

      const { error: saveErr } = await supabase
        .from("users")
        .update({
          resume_url: key,
          resume_uploaded_at: new Date().toISOString(),
        } as never)
        .eq("id", user.id);

      if (saveErr) throw new Error(saveErr.message);

      setCurrentUrl(key);
      setFile(null);
      setSuccess(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {currentUrl && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <p className="font-medium">Resume on file ✓</p>
          <p className="mt-0.5 text-xs">
            Your resume will be attached to every application automatically.
          </p>
        </div>
      )}

      {!currentUrl && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No resume uploaded yet — you&apos;ll be prompted to upload one when you
          apply to a job.
        </div>
      )}

      <div>
        <label
          htmlFor="resume"
          className="block text-sm font-medium text-gray-700"
        >
          {currentUrl ? "Replace resume" : "Upload resume"}
        </label>
        <input
          id="resume"
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
            setSuccess(false);
          }}
          className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-xs text-gray-500">
          PDF only · max {MAX_SIZE_MB} MB
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="text-sm text-green-700">Resume uploaded successfully.</p>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || pending}
        className="w-full sm:w-auto"
      >
        {pending
          ? "Uploading…"
          : currentUrl
            ? "Replace resume"
            : "Upload resume"}
      </Button>
    </div>
  );
}