import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const BUCKETS = {
  resumes: process.env.S3_PRIVATE_BUCKET!,
  assets: process.env.S3_PUBLIC_BUCKET!,
} as const;

export type UploadPurpose = "RESUME" | "COMPANY_LOGO";