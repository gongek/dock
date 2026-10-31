const DOCK_CDN_BASE_DEFAULT = "https://cdn.mrdn.gg/dock";
const DOCK_STAGING_CDN_BASE_DEFAULT = "https://staging-cdn.mrdn.gg/dock";

function readEnvTrim(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Canonical Dock CDN base (`…/dock`, no trailing slash). */
export function resolveDockCdnBaseUrl(): string {
  return (
    readEnvTrim("DOCK_CDN_BASE_URL") ??
    readEnvTrim("CDN_BASE_URL") ??
    readEnvTrim("NEXT_PUBLIC_DOCK_CDN_BASE_URL") ??
    DOCK_CDN_BASE_DEFAULT
  ).replace(/\/+$/, "");
}

export function resolveDockStagingCdnBaseUrl(): string {
  return (
    readEnvTrim("DOCK_STAGING_CDN_BASE_URL") ??
    readEnvTrim("STAGING_CDN_BASE_URL") ??
    DOCK_STAGING_CDN_BASE_DEFAULT
  ).replace(/\/+$/, "");
}

/** @deprecated Prefer `resolveDockCdnBaseUrl()`. */
export const DOCK_CDN_ORIGIN = resolveDockCdnBaseUrl();

export function dockCdnAllowedOriginsForCsp(): readonly string[] {
  const out = new Set<string>();
  try {
    out.add(new URL(resolveDockCdnBaseUrl()).origin);
  } catch {
    /* ignore */
  }
  try {
    out.add(new URL(resolveDockStagingCdnBaseUrl()).origin);
  } catch {
    /* ignore */
  }
  out.add("https://dock-cdn.mrdn.online");
  out.add("https://cdn.mrdn.online");
  return [...out];
}
