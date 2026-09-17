"use node";

import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { createCdnUploadUrl } from "../shared/cdnUpload";
import { getR2Config } from "./r2Env";

const R2_CONNECTION_TIMEOUT_MS = 10_000;
const R2_REQUEST_TIMEOUT_MS = 20_000;

let cachedClient: S3Client | null = null;

export function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    requestHandler: new NodeHttpHandler({
      connectionTimeout: R2_CONNECTION_TIMEOUT_MS,
      requestTimeout: R2_REQUEST_TIMEOUT_MS,
    }),
    maxAttempts: 2,
  });
  return cachedClient;
}

function getCdnUploadHmacSecret(): string {
  const dedicated = process.env.CDN_UPLOAD_HMAC_SECRET?.trim();
  if (dedicated) return dedicated;
  const { secretAccessKey } = getR2Config();
  return secretAccessKey;
}

/** Browser PUT URL on `dock-cdn.mrdn.online/upload/...`. */
export async function createR2PresignedPutUrl(args: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds?: number;
}): Promise<string> {
  return createCdnUploadUrl({
    key: args.key,
    contentType: args.contentType,
    contentLength: args.contentLength,
    secret: getCdnUploadHmacSecret(),
    ttlSeconds: args.expiresInSeconds,
  });
}

export async function deleteR2Object(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) return;
  const { bucketName } = getR2Config();
  const client = getR2Client();
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: trimmed,
      }),
    );
  } catch {
    // Best-effort cleanup.
  }
}

export function formatR2Error(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    if (/not fully configured|not configured/i.test(error.message)) {
      return "Image storage is not configured yet. Try again later.";
    }
    if (/timeout|timed out|ETIMEDOUT|ECONNRESET|ENOTFOUND/i.test(error.message)) {
      return "Image upload timed out. Check your connection and try again.";
    }
    if (/AccessDenied|Access Denied|not authorized/i.test(error.message)) {
      return "Image storage denied the upload. Check R2 credentials for the meridian-cdn bucket.";
    }
    return error.message;
  }
  return fallback;
}
