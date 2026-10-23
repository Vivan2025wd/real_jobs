import "server-only";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { s3, BUCKETS, type UploadPurpose } from "./client";

const ALLOWED_TYPES: Record<UploadPurpose, string[]> = {
  RESUME: ["application/pdf"],
  COMPANY_LOGO: ["image/png", "image/jpeg", "image/webp"],
};

const MAX_SIZE_BYTES: Record<UploadPurpose, number> = {
  RESUME: 5 * 1024 * 1024,       // 5 MB
  COMPANY_LOGO: 2 * 1024 * 1024, // 2 MB
};

const EXT_FOR_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type PresignedUpload = {
  uploadUrl: string;
  key: string;
  /** Set only for public assets (logos); null for private (resumes). */
  publicUrl: string | null;
  expiresIn: number;
};

export class PresignedError extends Error {}

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
  if (!ALLOWED_TYPES[purpose].includes(contentType)) {
    throw new PresignedError(
      `Content type "${contentType}" is not allowed for ${purpose}.`
    );
  }
  if (fileSize <= 0 || fileSize > MAX_SIZE_BYTES[purpose]) {
    throw new PresignedError(
      `File must be between 1 byte and ${MAX_SIZE_BYTES[purpose]} bytes.`
    );
  }

  const ext = EXT_FOR_TYPE[contentType];
  const prefix = purpose === "RESUME" ? "resumes" : "logos";
  const key = `${prefix}/${ownerId}/${Date.now()}-${randomUUID()}.${ext}`;
  const bucket = purpose === "RESUME" ? BUCKETS.resumes : BUCKETS.assets;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  const publicUrl =
    purpose === "COMPANY_LOGO"
      ? `${process.env.CLOUDFRONT_PUBLIC_DOMAIN || `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`}/${key}`
      : null;

  return { uploadUrl, key, publicUrl, expiresIn: 300 };
}