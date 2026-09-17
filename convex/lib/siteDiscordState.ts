import type { Id } from "../_generated/dataModel";

export type SiteDiscordOAuthState = {
  kind: "site";
  siteSlug: string;
  returnTo: string;
  origin: string;
  dockUserId?: Id<"users">;
  ownerSig?: string;
};

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSiteDiscordOAuthState(
  state: SiteDiscordOAuthState,
): string {
  return encodeBase64Url(JSON.stringify(state));
}

export function parseSiteDiscordOAuthState(
  state: string,
): SiteDiscordOAuthState | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(state)) as Partial<SiteDiscordOAuthState>;
    if (
      parsed.kind !== "site" ||
      !parsed.siteSlug?.trim() ||
      !parsed.returnTo?.trim() ||
      !parsed.origin?.trim()
    ) {
      return null;
    }
    const siteSlug = parsed.siteSlug.trim().toLowerCase();
    const origin = parsed.origin.replace(/\/$/, "");
    const dockUserId = parsed.dockUserId as Id<"users"> | undefined;
    const ownerSig = parsed.ownerSig?.trim();

    if (dockUserId && !ownerSig) {
      return null;
    }

    return {
      kind: "site",
      siteSlug,
      returnTo: parsed.returnTo,
      origin,
      ...(dockUserId ? { dockUserId, ownerSig } : {}),
    };
  } catch {
    return null;
  }
}

