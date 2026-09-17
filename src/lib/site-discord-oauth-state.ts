export type SiteDiscordOAuthState = {
  kind: "site";
  siteSlug: string;
  returnTo: string;
  origin: string;
};

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  return Buffer.from(padded, "base64").toString("utf8");
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
    return {
      kind: "site",
      siteSlug: parsed.siteSlug.trim().toLowerCase(),
      returnTo: parsed.returnTo,
      origin: parsed.origin.replace(/\/$/, ""),
    };
  } catch {
    return null;
  }
}

export function isLocalSiteOAuthOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
