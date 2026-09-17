import {
  DOCK_APEX,
  DOCK_STAGING_APEX,
  LOCAL_DEV_PORT,
  isLocalhostHostname,
} from "@/lib/site-host";
const DOCK_API_URL = "https://api.dock.surf";

export const ONBOARDING_SUBDOMAIN = "onboarding";

export const RESERVED_SITE_SLUGS = new Set([ONBOARDING_SUBDOMAIN]);

export function isReservedSiteSlug(slug: string): boolean {
  return RESERVED_SITE_SLUGS.has(slug.trim().toLowerCase());
}

export function isOnboardingAppHost(hostname: string): boolean {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  if (host === `${ONBOARDING_SUBDOMAIN}.${DOCK_APEX}`) return true;
  if (host === `${ONBOARDING_SUBDOMAIN}.${DOCK_STAGING_APEX}`) return true;
  if (host === `${ONBOARDING_SUBDOMAIN}.localhost`) return true;
  return false;
}

export function parseOnboardingLocalPrefix(pathname: string): {
  subPath: string;
} | null {
  const match = pathname.match(
    new RegExp(`^/subdomain/${ONBOARDING_SUBDOMAIN}(\\/.*)?$`),
  );
  if (!match) return null;
  const subPath = match[1] ?? "/";
  return { subPath };
}

function onboardingPublicPath(subPath: string): string {
  const normalized = subPath.startsWith("/") ? subPath : `/${subPath}`;
  if (typeof window !== "undefined" && isLocalhostHostname(window.location.hostname)) {
    return `/subdomain/${ONBOARDING_SUBDOMAIN}${normalized === "/" ? "" : normalized}`;
  }
  if (process.env.NODE_ENV === "development" && typeof window === "undefined") {
    return `/subdomain/${ONBOARDING_SUBDOMAIN}${normalized === "/" ? "" : normalized}`;
  }
  return normalized;
}

/** Path on the current onboarding host (local prefix or prod path). */
export function buildOnboardingPath(subPath: string): string {
  return onboardingPublicPath(subPath);
}

export function buildOnboardingOrigin(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    if (isOnboardingAppHost(hostname)) {
      return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
    }
    if (isLocalhostHostname(hostname)) {
      return `${protocol}//${hostname}:${port || LOCAL_DEV_PORT}`;
    }
    if (hostname.endsWith(`.${DOCK_STAGING_APEX}`) || hostname === DOCK_STAGING_APEX) {
      return `https://${ONBOARDING_SUBDOMAIN}.${DOCK_STAGING_APEX}`;
    }
    return `https://${ONBOARDING_SUBDOMAIN}.${DOCK_APEX}`;
  }

  if (process.env.NODE_ENV === "development") {
    return `http://localhost:${LOCAL_DEV_PORT}`;
  }
  return `https://${ONBOARDING_SUBDOMAIN}.${DOCK_APEX}`;
}

export function buildOnboardingUrl(subPath: string): string {
  const path = buildOnboardingPath(subPath);
  const origin = buildOnboardingOrigin();
  if (path.startsWith("/subdomain/")) {
    return `${origin}${path}`;
  }
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildOnboardingSelectCallbackUrl(): string {
  if (typeof window !== "undefined" && isLocalhostHostname(window.location.hostname)) {
    const port = window.location.port || LOCAL_DEV_PORT;
    return `http://localhost:${port}/callback/onboarding`;
  }
  if (process.env.NODE_ENV === "development") {
    return `http://localhost:${LOCAL_DEV_PORT}/callback/onboarding`;
  }
  return `${DOCK_API_URL}/callback/onboarding`;
}

/** Internal Next.js route prefix (after proxy rewrite). */
export function onboardingInternalPath(publicSubPath: string): string {
  const normalized = publicSubPath.startsWith("/")
    ? publicSubPath
    : `/${publicSubPath}`;
  if (normalized === "/" || normalized === "") {
    return "/onboarding";
  }
  return `/onboarding${normalized}`;
}
