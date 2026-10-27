import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // ---------------------------------------------------------------------------
  // AWS SDK v3 auto-adds `x-amz-checksum-crc32` to PutObject commands.
  // When used with getSignedUrl (which has no body), the SDK bakes the
  // checksum of an EMPTY payload (AAAAAA==) into the URL. The browser then
  // uploads a real file whose checksum differs, and S3 rejects the request
  // with 403 Forbidden (or 400 XAmzContentChecksumMismatch).
  //
  // "WHEN_REQUIRED" prevents the SDK from injecting the checksum unless the
  // operation requires it. S3 PutObject does not — the signature alone is
  // sufficient for a presigned PUT.
  // ---------------------------------------------------------------------------
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const BUCKETS = {
  resumes: process.env.S3_PRIVATE_BUCKET!,
  assets: process.env.S3_PUBLIC_BUCKET!,
} as const;

export type UploadPurpose = "RESUME" | "COMPANY_LOGO";