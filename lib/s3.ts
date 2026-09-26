import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import path from "path";
import fs from "fs/promises";

// Initialize S3 client if credentials exist
const hasAwsCredentials = Boolean(
  env.AWS_ACCESS_KEY_ID &&
  env.AWS_SECRET_ACCESS_KEY &&
  env.S3_BUCKET_NAME
);

export const s3Client = hasAwsCredentials
  ? new S3Client({
      region: env.AWS_REGION || "ap-southeast-1",
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

/**
 * Builds standard flat S3 key: ORIS-EMR/{tenant_name}/{filename}
 */
export function buildS3Key(tenantSlug: string, originalFileName: string): string {
  const cleanTenant = (tenantSlug || "default").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const sanitizedName = originalFileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .slice(-50);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);

  return `ORIS-EMR/${cleanTenant}/${timestamp}_${randomSuffix}_${sanitizedName}`;
}

export interface UploadResult {
  s3Key: string;
  url: string;
  sizeBytes: number;
  contentType: string;
}

/**
 * Uploads a file buffer to S3 (or falls back to local storage if AWS credentials are not configured).
 */
export async function uploadMedicalFile(
  tenantSlug: string,
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  const s3Key = buildS3Key(tenantSlug, fileName);
  const sizeBytes = buffer.length;

  if (s3Client && env.S3_BUCKET_NAME) {
    // 1. Upload to AWS S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const publicUrl = env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN
      ? `https://${env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/${s3Key}`
      : `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION || "ap-southeast-1"}.amazonaws.com/${s3Key}`;

    return {
      s3Key,
      url: publicUrl,
      sizeBytes,
      contentType,
    };
  }

  // 2. Local Fallback for development without AWS credentials
  // Saves to public/uploads/ORIS-EMR/{tenant_name}/
  const uploadDir = path.join(process.cwd(), "public", "uploads", "ORIS-EMR", tenantSlug);
  await fs.mkdir(uploadDir, { recursive: true });

  const safeFileName = path.basename(s3Key);
  const filePath = path.join(uploadDir, safeFileName);
  await fs.writeFile(filePath, buffer);

  const localUrl = `/uploads/ORIS-EMR/${tenantSlug}/${safeFileName}`;

  return {
    s3Key,
    url: localUrl,
    sizeBytes,
    contentType,
  };
}

/**
 * Returns accessible URL for an attachment S3 key
 */
export function getFileUrl(s3Key: string | null | undefined): string {
  if (!s3Key) return "";
  if (s3Key.startsWith("http://") || s3Key.startsWith("https://") || s3Key.startsWith("/")) {
    return s3Key;
  }

  if (env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN) {
    return `https://${env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/${s3Key}`;
  }

  if (env.S3_BUCKET_NAME) {
    return `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION || "ap-southeast-1"}.amazonaws.com/${s3Key}`;
  }

  // Fallback to local URL path
  return `/uploads/${s3Key}`;
}
