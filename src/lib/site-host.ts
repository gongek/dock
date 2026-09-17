export const DOCK_APEX = "dock.surf";
export const DOCK_STAGING_APEX = "dock.citrum.app";
export const LOCAL_DEV_PORT = "3001";

export type SiteHostRef = {
  siteId: string;
  slug: string;
};

type HostContext = {
  protocol: string;
  apex: string;
  port: string;
  usePathSubdomain: boolean;
};

export function isLocalhostHostname(hostname: string): boolean {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  return host === "localhost" || host === "127.0.0.1";
}

function getDashboardHostContext(): HostContext {
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;

    if (isLocalhostHostname(hostname)) {
      return {
        protocol,
        apex: "localhost",
        port: port || LOCAL_DEV_PORT,
        usePathSubdomain: true,
      };
    }

    if (hostname.endsWith(".localhost")) {
      return {
        protocol,
        apex: "localhost",
        port: port || LOCAL_DEV_PORT,
        usePathSubdomain: true,
      };
    }

    if (hostname === DOCK_APEX || hostname === `www.${DOCK_APEX}`) {
      return { protocol: "https:", apex: DOCK_APEX, port: "", usePathSubdomain: false };
    }

    if (
      hostname === DOCK_STAGING_APEX ||
      hostname.endsWith(`.${DOCK_STAGING_APEX}`)
    ) {
      return {
        protocol: "https:",
        apex: DOCK_STAGING_APEX,
        port: "",
        usePathSubdomain: false,
      };
    }
  }

  if (process.env.NODE_ENV === "development") {
    return {
      protocol: "http:",
      apex: "localhost",
      port: LOCAL_DEV_PORT,
      usePathSubdomain: true,
    };
  }

  return { protocol: "https:", apex: DOCK_APEX, port: "", usePathSubdomain: false };
}

export const PUBLIC_SITE_BASE_HEADER = "x-dock-public-base";

export function parseLocalSubdomainPath(pathname: string): {
  subdomainKey: string;
  subPath: string;
} | null {
  const match = pathname.match(/^\/subdomain\/([^/]+)(\/.*)?$/);
  if (!match) return null;

  const subdomainKey = match[1]?.trim();
  if (!subdomainKey) return null;

  const subPath = match[2] ?? "/";
  return { subdomainKey, subPath };
}

/** Public path prefix for a tenant site (empty on real subdomains). */
export function resolvePublicSiteBasePath(publicPathname: string): string {
  const local = parseLocalSubdomainPath(publicPathname);
  if (local) return `/subdomain/${local.subdomainKey}`;

  const sitesMatch = publicPathname.match(/^\/sites\/([^/]+)(?:\/.*)?$/);
  if (sitesMatch?.[1]) return `/sites/${sitesMatch[1]}`;

  return "";
}

export function parseSiteSlugFromHost(hostname: string): string | null {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  if (isLocalhostHostname(host)) return null;
  if (host.endsWith(".localhost")) {
    const label = host.slice(0, -".localhost".length).split(".")[0];
    return label || null;
  }
  if (host === DOCK_APEX || host === `www.${DOCK_APEX}`) return null;
  if (host === DOCK_STAGING_APEX || host === `www.${DOCK_STAGING_APEX}`) {
    return null;
  }
  if (host.endsWith(`.${DOCK_APEX}`)) {
    const label = host.slice(0, -(`.${DOCK_APEX}`.length));
    if (!label || label.includes(".")) return null;
    return label;
  }
  if (host.endsWith(`.${DOCK_STAGING_APEX}`)) {
    const label = host.slice(0, -(`.${DOCK_STAGING_APEX}`.length));
    if (!label || label.includes(".")) return null;
    return label;
  }
  return null;
}

export function isMainDockHost(hostname: string): boolean {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  return (
    host === DOCK_APEX ||
    host === `www.${DOCK_APEX}` ||
    host === DOCK_STAGING_APEX ||
    host === `www.${DOCK_STAGING_APEX}` ||
    isLocalhostHostname(host)
  );
}

export function isDockSubdomainHost(hostname: string): boolean {
  return parseSiteSlugFromHost(hostname) !== null;
}

export function isCustomDomainHost(hostname: string): boolean {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  if (!host || isMainDockHost(host) || isDockSubdomainHost(host)) {
    return false;
  }
  return true;
}

export function isSitePreviewPath(pathname: string): boolean {
  return pathname === "/preview" || pathname.startsWith("/preview/");
}

export function isDevPreviewHost(hostname?: string): boolean {
  if (hostname) return isLocalhostHostname(hostname);
  if (typeof window !== "undefined") {
    return isLocalhostHostname(window.location.hostname);
  }
  return process.env.NODE_ENV === "development";
}

export function buildSiteOrigin(ref: SiteHostRef): string {
  const { protocol, apex, port, usePathSubdomain } = getDashboardHostContext();

  if (usePathSubdomain) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/subdomain/${ref.slug}`;
    }
    return `${protocol}//localhost:${port}/subdomain/${ref.slug}`;
  }

  return `${protocol}//${ref.slug}.${apex}`;
}

export function buildSiteEditUrl(ref: SiteHostRef): string {
  return `${buildSiteOrigin(ref)}/edit`;
}

export function buildDockLoginUrl(returnTo?: string): string {
  const { protocol, apex, port, usePathSubdomain } = getDashboardHostContext();

  let loginUrl: string;
  if (typeof window !== "undefined" && isMainDockHost(window.location.hostname)) {
    loginUrl = `${window.location.origin}/login`;
  } else if (usePathSubdomain) {
    loginUrl = `${protocol}//localhost:${port}/login`;
  } else {
    loginUrl = `${protocol}//${apex}/login`;
  }

  if (!returnTo?.trim()) {
    return loginUrl;
  }

  const url = new URL(loginUrl);
  url.searchParams.set("returnTo", returnTo.trim());
  return url.toString();
}

export function buildDockHomeUrl(): string {
  const { protocol, apex, port, usePathSubdomain } = getDashboardHostContext();

  if (typeof window !== "undefined" && isMainDockHost(window.location.hostname)) {
    return `${window.location.origin}/`;
  }
  if (usePathSubdomain) {
    return `${protocol}//localhost:${port}/`;
  }
  return `${protocol}//${apex}/`;
}

export function buildSitePreviewUrl(ref: SiteHostRef): string {
  const origin = buildSiteOrigin(ref);
  if (isDevPreviewHost()) {
    return `${origin}/preview`;
  }
  return origin;
}

export function formatSiteHost(ref: SiteHostRef): string {
  const { port, usePathSubdomain } = getDashboardHostContext();

  if (usePathSubdomain) {
    if (typeof window !== "undefined") {
      const { hostname, port: windowPort } = window.location;
      const hostPort = windowPort ? `${hostname}:${windowPort}` : hostname;
      return `${hostPort}/subdomain/${ref.slug}`;
    }
    return `localhost:${port}/subdomain/${ref.slug}`;
  }

  return `${ref.slug}.${DOCK_APEX}`;
}

export function formatSiteHostPreview(subdomainKey: string): string {
  const { port, usePathSubdomain } = getDashboardHostContext();

  if (usePathSubdomain) {
    return `localhost:${port}/subdomain/${subdomainKey}`;
  }

  return `${subdomainKey}.${DOCK_APEX}`;
}
