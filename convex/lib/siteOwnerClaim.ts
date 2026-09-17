import type { Id } from "../_generated/dataModel";

function ownerClaimSecret(): string {
  const secret =
    process.env.AUTH_DISCORD_SECRET?.trim() ??
    process.env.JWT_PRIVATE_KEY?.trim();
  if (!secret) {
    throw new Error("AUTH_DISCORD_SECRET is required for site owner sign-in.");
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacSha256(message: string): Promise<ArrayBuffer> {
  const secret = ownerClaimSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
}

function ownerClaimPayload(input: {
  siteSlug: string;
  origin: string;
  dockUserId: Id<"users">;
}): string {
  const siteSlug = input.siteSlug.trim().toLowerCase();
  const origin = input.origin.trim().replace(/\/$/, "");
  return `${siteSlug}\0${origin}\0${input.dockUserId}`;
}

export async function signSiteOwnerClaim(input: {
  siteSlug: string;
  origin: string;
  dockUserId: Id<"users">;
}): Promise<string> {
  const signature = await hmacSha256(ownerClaimPayload(input));
  return toBase64Url(signature);
}

export async function verifySiteOwnerClaim(input: {
  siteSlug: string;
  origin: string;
  dockUserId: Id<"users">;
  ownerSig: string;
}): Promise<boolean> {
  try {
    const expected = await signSiteOwnerClaim(input);
    const left = fromBase64Url(expected);
    const right = fromBase64Url(input.ownerSig);
    if (left.length !== right.length) {
      return false;
    }
    let diff = 0;
    for (let i = 0; i < left.length; i += 1) {
      diff |= left[i] ^ right[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}
