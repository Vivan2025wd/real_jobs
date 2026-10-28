"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Produce a clean display filename from an S3 key like
 * "resumes/<uuid>/1793083848074-<uuid>.pdf".
 * The underlying key leaks user IDs and timestamps — showing "Resume.pdf"
 * is more professional and just as informative.
 */
function displayFilename(key: string): string {
  const last = key.split("/").pop() ?? "";
  const ext = last.includes(".") ? last.split(".").pop() : "pdf";
  return `Resume.${ext || "pdf"}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ResumeUpload({ initialUrl }: { initialUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);

  function clearFile() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFileSelect(f: File | null) {
    setError(null);
    setErrorHint(null);
    setSuccess(false);

    if (!f) {
      clearFile();
      return;
    }

    if (f.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      setErrorHint("Convert your document to PDF before uploading.");
      clearFile();
      return;
    }

    if (f.size > MAX_SIZE_BYTES) {
      setError(`File is too large. Max ${MAX_SIZE_MB} MB.`);
      setErrorHint(`Your file is ${formatBytes(f.size)}.`);
      clearFile();
      return;
    }

    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;

    setPending(true);
    setError(null);
    setErrorHint(null);
    setSuccess(false);

    try {
      // ─── 1. Ask the server for a pre-signed URL ───
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

      // ─── 2. Upload directly to S3 ───
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });

      if (!putRes.ok) {
        const body = await putRes.text().catch(() => "");
        console.error("[ResumeUpload] S3 PUT failed:", {
          status: putRes.status,
          body: body.slice(0, 500),
          uploadUrl,
        });
        throw new Error(`Upload to storage failed (${putRes.status})`);
      }

      // ─── 3. Persist the key on the user row ───
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
      clearFile();
      setSuccess(true);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      if (msg.includes("storage failed")) {
        setErrorHint("Check your connection and try again.");
      } else if (msg.includes("prepare upload")) {
        setErrorHint("The server couldn't generate an upload URL.");
      }
    } finally {
      setPending(false);
    }
  }

  const hasResume = !!currentUrl;

  return (
    <div className="space-y-4">
      {/* ─── Status card ─── */}
      {hasResume ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-900">
                Resume on file
              </p>
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-emerald-800">
              {displayFilename(currentUrl!)}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-700/80">
              Auto-attached to every application you submit.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm ring-1 ring-amber-200">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              No resume on file
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              You&apos;ll need to upload one before applying to jobs.
            </p>
          </div>
        </div>
      )}

      {/* ─── Drop zone (only when no file is selected) ─── */}
      {!file && (
        <label
          htmlFor="resume-input"
          className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 px-4 py-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 transition group-hover:text-indigo-600 group-hover:ring-indigo-200">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {hasResume ? "Replace resume" : "Upload resume"}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Click to browse · PDF only · max {MAX_SIZE_MB} MB
            </p>
          </div>
          <input
            ref={inputRef}
            id="resume-input"
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
      )}

      {/* ─── Selected file row ─── */}
      {file && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {file.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatBytes(file.size)} · ready to upload
            </p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            disabled={pending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-white hover:text-gray-700 disabled:opacity-50 sm:h-7 sm:w-7"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── Error banner ─── */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-rose-900">{error}</p>
            {errorHint && (
              <p className="mt-0.5 text-xs text-rose-700">{errorHint}</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Success banner ─── */}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">
            Resume uploaded successfully.
          </p>
        </div>
      )}

      {/* ─── Actions ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || pending}
          className="w-full sm:w-auto"
          icon={
            pending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )
          }
        >
          {pending
            ? "Uploading…"
            : hasResume
              ? "Replace resume"
              : "Upload resume"}
        </Button>

        {file && !pending && (
          <Button
            type="button"
            variant="ghost"
            onClick={clearFile}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}