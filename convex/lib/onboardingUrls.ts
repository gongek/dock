import {
  DOCK_SITE_URL,
  DOCK_STAGING_URL,
  LOCAL_SITE_URL,
  isLocalRedirectOrigin,
} from "../oauth";

const ONBOARDING_SUBDOMAIN = "onboarding";

function siteBaseUrl(): string {
  const configured = process.env.SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return DOCK_SITE_URL;
}

function onboardingOriginFromSiteUrl(siteUrl: string): string {
  try {
    const url = new URL(siteUrl);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      const port = url.port || "3001";
      return `http://localhost:${port}`;
    }
    if (url.hostname === "dock.citrum.app" || url.hostname.endsWith(".dock.citrum.app")) {
      return `https://${ONBOARDING_SUBDOMAIN}.dock.citrum.app`;
    }
    return `https://${ONBOARDING_SUBDOMAIN}.dock.surf`;
  } catch {
    return `https://${ONBOARDING_SUBDOMAIN}.dock.surf`;
  }
}

export function buildOnboardingPublicUrl(
  subPath: string,
  siteUrl?: string,
): string {
  const base = siteBaseUrl();
  const origin = onboardingOriginFromSiteUrl(siteUrl ?? base);
  const path = subPath.startsWith("/") ? subPath : `/${subPath}`;

  try {
    const originUrl = new URL(origin);
    if (originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1") {
      const localPath =
        path === "/"
          ? `/subdomain/${ONBOARDING_SUBDOMAIN}`
          : `/subdomain/${ONBOARDING_SUBDOMAIN}${path}`;
      return `${origin}${localPath}`;
    }
  } catch {
    // fall through
  }

  return `${origin}${path}`;
}

export function resolveOnboardingSiteUrlHint(): string {
  return process.env.SITE_URL ?? DOCK_SITE_URL;
}

function isAllowedOnboardingSiteOrigin(origin: string): boolean {
  if (isLocalRedirectOrigin(origin)) {
    return true;
  }
  if (origin === DOCK_SITE_URL || origin === DOCK_STAGING_URL) {
    return true;
  }
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:") {
      return false;
    }
    return (
      hostname === "dock.surf" ||
      hostname.endsWith(".dock.surf") ||
      hostname === "dock.citrum.app" ||
      hostname.endsWith(".dock.citrum.app")
    );
  } catch {
    return false;
  }
}

export function resolveOnboardingSiteUrlFromRequest(
  request: Request,
): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
    try {
      const origin = new URL(`${proto}://${forwardedHost}`).origin;
      if (isAllowedOnboardingSiteOrigin(origin)) {
        return origin;
      }
    } catch {
      // fall through
    }
  }
  return resolveOnboardingSiteUrlHint();
}

export { DOCK_STAGING_URL, DOCK_SITE_URL, LOCAL_SITE_URL };
