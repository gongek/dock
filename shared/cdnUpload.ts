import { DOCK_CDN_ORIGIN } from "./cdnOrigin";

export const CDN_UPLOAD_PATH_PREFIX = "/upload/";
export const CDN_UPLOAD_TTL_SECONDS = 900;

const ALLOWED_KEY_PREFIXES = ["public/"] as const;

export function assertCdnUploadObjectKey(key: string): void {
  const normalized = key.trim().replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.includes("\\")) {
    throw new Error("Invalid upload key.");
  }
  if (!ALLOWED_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    throw new Error("Invalid upload key.");
  }
}

export function cdnUploadPath(key: string): string {
  return `${CDN_UPLOAD_PATH_PREFIX}${key
    .trim()
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function cdnUploadPayload(args: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresAtUnixSeconds: number;
}): string {
  return `${args.key}\n${args.contentType}\n${args.contentLength}\n${args.expiresAtUnixSeconds}`;
}

export async function createCdnUploadUrl(args: {
  key: string;
  contentType: string;
  contentLength: number;
  secret: string;
  nowMs?: number;
  ttlSeconds?: number;
}): Promise<string> {
  assertCdnUploadObjectKey(args.key);
  const nowMs = args.nowMs ?? Date.now();
  const ttlSeconds = args.ttlSeconds ?? CDN_UPLOAD_TTL_SECONDS;
  const expiresAtUnixSeconds = Math.floor(nowMs / 1000) + ttlSeconds;
  const payload = cdnUploadPayload({
    key: args.key.trim().replace(/^\/+/, ""),
    contentType: args.contentType,
    contentLength: args.contentLength,
    expiresAtUnixSeconds,
  });
  const sig = await hmacSha256Hex(args.secret, payload);
  const url = new URL(`${DOCK_CDN_ORIGIN}${cdnUploadPath(args.key)}`);
  url.searchParams.set("exp", String(expiresAtUnixSeconds));
  url.searchParams.set("sig", sig);
  return url.toString();
}
