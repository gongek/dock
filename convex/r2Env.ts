import { DOCK_CDN_ORIGIN } from "../shared/cdnOrigin";

export const MERIDIAN_CDN_BUCKET_NAME = "meridian-cdn";

export const SITE_MEDIA_MAX_BYTES = 8 * 1024 * 1024;

export function tryPublicUrlForR2Key(key: string): string | null {
  const normalizedKey = key.trim().replace(/^\/+/, "");
  if (!normalizedKey) return null;
  const encoded = normalizedKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${DOCK_CDN_ORIGIN}/${encoded}`;
}

export function publicUrlForR2Key(key: string): string {
  const url = tryPublicUrlForR2Key(key);
  if (!url) {
    throw new Error("R2 public base URL is not configured.");
  }
  return url;
}

export function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const configuredBucket = process.env.R2_BUCKET_NAME?.trim();
  const bucketName =
    !configuredBucket || configuredBucket === "meridian"
      ? MERIDIAN_CDN_BUCKET_NAME
      : configuredBucket;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("R2 credentials are not fully configured.");
  }
  return { accountId, accessKeyId, secretAccessKey, bucketName };
}
