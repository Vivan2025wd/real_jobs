"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ImageIcon,
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"] as const;
const ACCEPTED_LABEL = "PNG, JPEG, or WebP · max 2 MB";

function verifyImageLoads(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), 5000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

export function CompanyLogoUploader({
  initialUrl,
}: {
  initialUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [imageBroken, setImageBroken] = useState(false);

  function clearFile() {
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFileSelect(f: File | null) {
    setError(null);
    setErrorHint(null);
    setSuccess(false);
    setImageBroken(false);

    if (!f) {
      clearFile();
      return;
    }

    if (!ACCEPTED.includes(f.type as (typeof ACCEPTED)[number])) {
      setError("Use PNG, JPEG, or WebP.");
      setErrorHint("The file you selected isn't a supported image format.");
      clearFile();
      return;
    }

    if (f.size > MAX_SIZE_BYTES) {
      setError("File is too large. Max 2 MB.");
      setErrorHint(`Your file is ${(f.size / 1024 / 1024).toFixed(1)} MB.`);
      clearFile();
      return;
    }

    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file) return;

    setPending(true);
    setError(null);
    setErrorHint(null);
    setSuccess(false);

    try {
      const presignRes = await fetch("/api/s3/presigned-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purpose: "COMPANY_LOGO",
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!presignRes.ok) {
        const { error: msg } = (await presignRes.json()) as { error?: string };
        throw new Error(msg ?? "Could not prepare upload");
      }

      const { uploadUrl, publicUrl } = (await presignRes.json()) as {
        uploadUrl: string;
        publicUrl: string;
      };

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });

      if (!putRes.ok) {
        const body = await putRes.text().catch(() => "");
        console.error("[CompanyLogoUploader] S3 PUT failed:", {
          status: putRes.status,
          body: body.slice(0, 500),
          uploadUrl,
        });
        throw new Error(`Upload to storage failed (${putRes.status})`);
      }

      const urlWorks = await verifyImageLoads(publicUrl);
      if (!urlWorks) {
        console.error("[CompanyLogoUploader] Upload succeeded but URL is broken:", publicUrl);
        setError("Image uploaded but can't be displayed.");
        setErrorHint(
          "The asset bucket may not be publicly readable. Check that " +
            `"${new URL(publicUrl).hostname}" serves the file. ` +
            `URL: ${publicUrl}`
        );
        setPending(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired — please sign in again");

      const { error: saveErr } = await supabase
        .from("companies")
        .update({ logo_url: publicUrl } as never)
        .eq("employer_id", user.id);

      if (saveErr) throw new Error(saveErr.message);

      setCurrentUrl(publicUrl);
      setImageBroken(false);
      clearFile();
      setSuccess(true);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      if (msg.includes("storage failed")) {
        setErrorHint("Check that the S3 bucket allows PUT from this origin (CORS).");
      } else if (msg.includes("prepare upload")) {
        setErrorHint("The server couldn't generate a pre-signed URL. Check env vars.");
      }
    } finally {
      setPending(false);
    }
  }

  const showExisting = currentUrl && !file;

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* ─── Preview area ─── */}
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div className="relative shrink-0">
          {showExisting ? (
            <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:h-24 sm:w-24 sm:rounded-2xl">
              {imageBroken ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-rose-50 text-rose-500">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-[9px] font-medium sm:text-[10px]">Broken URL</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUrl}
                  alt="Company logo"
                  className="h-full w-full object-cover"
                  onError={() => setImageBroken(true)}
                />
              )}
            </div>
          ) : preview ? (
            <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm ring-2 ring-indigo-100 sm:h-24 sm:w-24 sm:rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Logo preview"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 sm:h-24 sm:w-24 sm:rounded-2xl">
              <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-[9px] font-medium sm:text-[10px]">No logo</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <p className="text-xs font-medium text-gray-900 sm:text-sm">
            {showExisting
              ? "Current company logo"
              : preview
                ? "Ready to upload"
                : "No logo set"}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">{ACCEPTED_LABEL}</p>

          {imageBroken && currentUrl && (
            <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-700 sm:px-2.5 sm:py-2 sm:text-xs">
              <p className="font-medium">The saved logo URL isn&apos;t loading.</p>
              <p className="mt-1 break-all text-rose-600/80">{currentUrl}</p>
              <p className="mt-1 leading-snug">
                Check that your assets bucket is publicly readable.
              </p>
            </div>
          )}

          {success && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] text-emerald-700 sm:px-2.5 sm:text-xs">
              <CheckCircle2 className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
              Logo updated successfully.
            </div>
          )}
        </div>
      </div>

      {/* ─── Drop zone ─── */}
      {!file && (
        <label
          htmlFor="logo-input"
          className="group flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 px-3 py-5 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40 sm:gap-2 sm:px-4 sm:py-6"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 transition group-hover:text-indigo-600 group-hover:ring-indigo-200 sm:h-10 sm:w-10 sm:rounded-xl">
            <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-900 sm:text-sm">
              {currentUrl ? "Replace logo" : "Upload a logo"}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs">
              Click to browse · {ACCEPTED_LABEL}
            </p>
          </div>
          <input
            ref={inputRef}
            id="logo-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
      )}

      {/* ─── Selected file row ─── */}
      {file && (
        <div className="flex w-full items-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 p-2 sm:gap-3 sm:px-3 sm:py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100 sm:h-9 sm:w-9">
            <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-900 sm:text-sm">
              {file.name}
            </p>
            <p className="text-[10px] text-gray-500 sm:text-xs">
              {(file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            disabled={pending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white hover:text-gray-700 disabled:opacity-50 sm:h-7 sm:w-7"
            aria-label="Remove file"
          >
            <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </button>
        </div>
      )}

      {/* ─── Error banner ─── */}
      {error && (
        <div className="flex w-full items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 sm:gap-2.5 sm:px-3 sm:py-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500 sm:h-4 sm:w-4" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-rose-900 sm:text-sm">{error}</p>
            {errorHint && (
              <p className="mt-0.5 break-words text-[10px] leading-snug text-rose-700 sm:text-xs">
                {errorHint}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Actions ─── */}
      {/* මොබයිල් එකේදී බටන්ස් එකින් එක පහළින් (flex-col), ඩෙස්ක්ටොප් එකේදී පැත්තට පැත්ත (sm:flex-row) */}
      <div className="flex w-full flex-col items-center gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || pending}
          className="w-full justify-center sm:w-auto"
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
            : currentUrl
              ? "Replace logo"
              : "Upload logo"}
        </Button>

        {file && !pending && (
          <Button
            type="button"
            variant="ghost"
            onClick={clearFile}
            size="md"
            className="w-full justify-center sm:w-auto"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* ─── Debug link (visible only when image is broken) ─── */}
      {imageBroken && currentUrl && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-1 break-all text-[10px] text-indigo-600 hover:text-indigo-700 hover:underline sm:w-auto sm:justify-start sm:text-xs"
        >
          Open logo URL in new tab
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      )}
    </div>
  );
}