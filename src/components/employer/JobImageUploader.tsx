"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  ImageIcon,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

type Props = {
  initialUrl: string | null;
  onUrlChange: (url: string | null) => void;
};

export function JobImageUploader({ initialUrl, onUrlChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearSelection() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFileSelect(selected: File | null) {
    setError(null);
    if (!selected) {
      clearSelection();
      return;
    }
    if (!ACCEPTED.has(selected.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      clearSelection();
      return;
    }
    if (selected.size <= 0 || selected.size > MAX_SIZE_BYTES) {
      setError("Image must be larger than 0 bytes and no larger than 5 MB.");
      clearSelection();
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleUpload() {
    if (!file) return;
    setPending(true);
    setError(null);

    try {
      const presignResponse = await fetch("/api/s3/presigned-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purpose: "JOB_IMAGE",
          contentType: file.type,
          fileSize: file.size,
        }),
      });
      const presignResult = (await presignResponse.json()) as {
        uploadUrl?: string;
        publicUrl?: string | null;
        error?: string;
      };
      if (!presignResponse.ok) {
        throw new Error(presignResult.error ?? "Could not prepare image upload.");
      }
      if (!presignResult.uploadUrl || !presignResult.publicUrl) {
        throw new Error("The server did not return a public image URL.");
      }

      const uploadResponse = await fetch(presignResult.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Image upload failed (${uploadResponse.status}).`);
      }

      setCurrentUrl(presignResult.publicUrl);
      onUrlChange(presignResult.publicUrl);
      clearSelection();
    } catch (uploadError) {
      console.error("[JobImageUploader] upload failed:", uploadError);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed. Please try again."
      );
    } finally {
      setPending(false);
    }
  }

  function removeImage() {
    clearSelection();
    setCurrentUrl(null);
    onUrlChange(null);
    setError(null);
  }

  const displayedUrl = preview ?? currentUrl;

  return (
    <div className="w-full space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
        {displayedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayedUrl}
            alt="Job poster preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
            <ImageIcon className="h-7 w-7" />
            <span className="text-xs">No poster selected</span>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        JPEG, PNG, or WebP · maximum 5 MB
      </p>

      {!file && (
        <label
          htmlFor="job-image-input"
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 px-3 py-5 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40"
        >
          <Upload className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-800">
            {currentUrl ? "Choose a replacement poster" : "Choose a job poster"}
          </span>
          <input
            ref={inputRef}
            id="job-image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              handleFileSelect(event.target.files?.[0] ?? null)
            }
            className="sr-only"
          />
        </label>
      )}

      {file && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5">
          <ImageIcon className="h-4 w-4 shrink-0 text-indigo-600" />
          <span className="min-w-0 flex-1 truncate text-xs text-gray-800">
            {file.name}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            disabled={pending}
            aria-label="Cancel selected image"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {file && (
          <Button
            type="button"
            onClick={handleUpload}
            disabled={pending}
            className="w-full justify-center sm:w-auto"
            icon={
              pending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )
            }
          >
            {pending ? "Uploading…" : "Upload poster"}
          </Button>
        )}
        {currentUrl && !file && (
          <Button
            type="button"
            variant="ghost"
            onClick={removeImage}
            className="w-full justify-center sm:w-auto"
          >
            Remove poster
          </Button>
        )}
      </div>
    </div>
  );
}
