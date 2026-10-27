import "server-only";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { s3, BUCKETS, type UploadPurpose } from "./client";

// ---------------------------------------------------------------------------
// Purpose-specific constraints
// ---------------------------------------------------------------------------
const ALLOWED_TYPES: Record<UploadPurpose, string[]> = {
  RESUME: ["application/pdf"],
  COMPANY_LOGO: ["image/png", "image/jpeg", "image/webp"],
};

const MAX_SIZE_BYTES: Record<UploadPurpose, number> = {
  RESUME: 5 * 1024 * 1024, // 5 MB
  COMPANY_LOGO: 2 * 1024 * 1024, // 2 MB
};

const EXT_FOR_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export type PresignedUpload = {
  uploadUrl: string;
  key: string;
  /** Set only for public assets (logos); null for private (resumes). */
  publicUrl: string | null;
  expiresIn: number;
};

export class PresignedError extends Error {}

// ---------------------------------------------------------------------------
// Public asset URL resolver
//
// The env template's `CLOUDFRONT_PUBLIC_DOMAIN=https://cdn.yourdomain.com`
// placeholder is a common copy-paste hazard. If someone keeps it, every
// uploaded logo URL points to a domain that doesn't exist — the <img> tag
// then silently fails and the user sees "logo isn't showing".
//
// This resolver detects placeholder values (or malformed URLs) and falls
// back to the direct S3 URL. The bucket needs public read for the fallback
// to work, which is documented in the AWS setup section of the README.
// ---------------------------------------------------------------------------
function resolvePublicUrl(bucket: string, key: string): string {
  const raw = (process.env.CLOUDFRONT_PUBLIC_DOMAIN ?? "").trim();

  // Anything matching these patterns is treated as "not configured" and
  // skipped in favour of the direct S3 URL.
  const isPlaceholder =
    raw === "" ||
    raw.includes("yourdomain.com") ||
    raw.includes("YOUR_") ||
    raw.includes("example.com") ||
    !/^https?:\/\/[^/]+\.[^/]+/.test(raw); // must look like a URL

  if (!isPlaceholder) {
    // Strip trailing slashes so `https://cdn.x.com/` + `/key` doesn't
    // produce a double slash.
    const base = raw.replace(/\/+$/, "");
    return `${base}/${key}`;
  }

  // Fallback: direct S3 URL (virtual-hosted–style).
  // Works if the assets bucket is publicly readable.
  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// ---------------------------------------------------------------------------
// Main entry — called by /api/s3/presigned-url
// ---------------------------------------------------------------------------
export async function buildPresignedUpload({
  purpose,
  ownerId,
  contentType,
  fileSize,
}: {
  purpose: UploadPurpose;
  ownerId: string;
  contentType: string;
  fileSize: number;
}): Promise<PresignedUpload> {
  // ─── Validate content type ───
  if (!ALLOWED_TYPES[purpose].includes(contentType)) {
    throw new PresignedError(
      `Content type "${contentType}" is not allowed for ${purpose}.`
    );
  }

  // ─── Validate file size ───
  if (fileSize <= 0 || fileSize > MAX_SIZE_BYTES[purpose]) {
    throw new PresignedError(
      `File must be between 1 byte and ${MAX_SIZE_BYTES[purpose]} bytes.`
    );
  }

  // ─── Build the S3 key ───
  const ext = EXT_FOR_TYPE[contentType];
  const prefix = purpose === "RESUME" ? "resumes" : "logos";
  const key = `${prefix}/${ownerId}/${Date.now()}-${randomUUID()}.${ext}`;
  const bucket = purpose === "RESUME" ? BUCKETS.resumes : BUCKETS.assets;

  // ─── Sign the PUT URL ───
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  // ─── Compute the public URL (logos only) ───
  const publicUrl =
    purpose === "COMPANY_LOGO" ? resolvePublicUrl(bucket, key) : null;

  return { uploadUrl, key, publicUrl, expiresIn: 300 };
}