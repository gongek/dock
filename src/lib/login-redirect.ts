const DEFAULT_LOGIN_REDIRECT = "/dashboard";

export const LOGIN_RETURN_TO_SUBTITLES = {
  siteBuilder: "To continue to your site builder.",
  sites: "To access your sites.",
  dashboard: "Please sign in to access your dashboard.",
  preview: "To preview your site.",
  signup: "To continue onboarding.",
  fallback: "To continue where you left off.",
} as const;

function resolveOrigin(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.location.origin;
}

export function isAllowedLoginReturnTo(returnTo: string): boolean {
  const trimmed = returnTo.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//");
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return true;
    }
    if (host === "dock.surf" || host.endsWith(".dock.surf")) {
      return true;
    }
    if (host === "dock.citrum.app" || host.endsWith(".dock.citrum.app")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function resolveLoginRedirectTarget(
  returnTo: string | null | undefined,
  fallback: string = DEFAULT_LOGIN_REDIRECT,
): string {
  const trimmed = returnTo?.trim();
  if (!trimmed) {
    const origin = resolveOrigin();
    if (origin) {
      return `${origin}${fallback.startsWith("/") ? fallback : `/${fallback}`}`;
    }
    return fallback;
  }

  if (trimmed.startsWith("/")) {
    const origin = resolveOrigin();
    return origin ? `${origin}${trimmed}` : trimmed;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    const origin = resolveOrigin();
    if (origin) {
      return `${origin}${DEFAULT_LOGIN_REDIRECT}`;
    }
    return DEFAULT_LOGIN_REDIRECT;
  }
}

export function appendReturnToParam(loginUrl: string, returnTo: string): string {
  const url = new URL(loginUrl);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

function normalizeReturnToPath(pathname: string): string {
  return pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
}

function parseReturnToPath(returnTo: string): string {
  const trimmed = returnTo.trim();
  if (trimmed.startsWith("/")) {
    return normalizeReturnToPath(trimmed);
  }

  try {
    return normalizeReturnToPath(new URL(trimmed).pathname);
  } catch {
    return normalizeReturnToPath(trimmed);
  }
}

function isSitePreviewReturnToPath(path: string): boolean {
  if (path === "/preview" || path.startsWith("/preview/")) {
    return true;
  }
  return /^\/subdomain\/[^/]+\/preview(\/|$)/.test(path);
}

export function resolveLoginReturnToSubtitle(returnTo: string): string {
  const path = parseReturnToPath(returnTo);

  if (path.endsWith("/edit") || path === "/edit") {
    return LOGIN_RETURN_TO_SUBTITLES.siteBuilder;
  }

  if (isSitePreviewReturnToPath(path)) {
    return LOGIN_RETURN_TO_SUBTITLES.preview;
  }

  if (path === "/signup/email" || path.startsWith("/signup/")) {
    return LOGIN_RETURN_TO_SUBTITLES.signup;
  }

  if (path === "/dashboard/sites" || path.startsWith("/dashboard/sites/")) {
    return LOGIN_RETURN_TO_SUBTITLES.sites;
  }

  if (path === "/dashboard") {
    return LOGIN_RETURN_TO_SUBTITLES.dashboard;
  }

  return LOGIN_RETURN_TO_SUBTITLES.fallback;
}
