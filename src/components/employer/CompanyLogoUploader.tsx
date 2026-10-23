"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export function CompanyLogoUploader({
  initialUrl,
}: {
  initialUrl: string | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);

  async function handleUpload() {
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      setError("Use PNG, JPEG, or WebP.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Max 2 MB.");
      return;
    }

    setPending(true);
    setError(null);

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
      if (!putRes.ok) throw new Error("Upload failed");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired");

      const { error: saveErr } = await supabase
        .from("companies")
        .update({ logo_url: publicUrl } as never)
        .eq("employer_id", user.id);

      if (saveErr) throw new Error(saveErr.message);

      setCurrentUrl(publicUrl);
      setFile(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentUrl}
          alt="Company logo"
          className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
          No logo
        </div>
      )}

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setError(null);
        }}
        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button onClick={handleUpload} disabled={!file || pending} size="sm">
        {pending ? "Uploading…" : currentUrl ? "Replace logo" : "Upload logo"}
      </Button>
    </div>
  );
}
