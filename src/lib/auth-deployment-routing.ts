export const DOCK_STAGING_URL = "https://dock.citrum.app";

function redirectToCookieName(provider: string) {
  return `__Host-${provider}RedirectTo`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) {
    return null;
  }
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }
  return null;
}

function isStagingRedirectTo(redirectTo: string | null): boolean {
  return redirectTo?.startsWith(DOCK_STAGING_URL) ?? false;
}

function stagingConvexSiteUrl(): string {
  const url = process.env.CONVEX_STAGING_SITE_URL;
  if (!url) {
    throw new Error("Missing environment variable `CONVEX_STAGING_SITE_URL`");
  }
  return url.replace(/\/$/, "");
}

function productionConvexSiteUrl(): string {
  const url = process.env.CONVEX_PRODUCTION_SITE_URL;
  if (!url) {
    throw new Error("Missing environment variable `CONVEX_PRODUCTION_SITE_URL`");
  }
  return url.replace(/\/$/, "");
}

export function resolveConvexSiteUrl(
  request: Request,
  provider?: string,
): string {
  const incoming = new URL(request.url);
  let redirectTo = incoming.searchParams.get("redirectTo");

  if (!redirectTo && provider) {
    redirectTo = readCookie(request, redirectToCookieName(provider));
  }

  return isStagingRedirectTo(redirectTo)
    ? stagingConvexSiteUrl()
    : productionConvexSiteUrl();
}
