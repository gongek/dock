import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";
import {
  isLocalhostHostname,
  isCustomDomainHost,
  isMainDockHost,
  isSitePreviewPath,
  parseLocalSubdomainPath,
  parseSiteSlugFromHost,
  PUBLIC_SITE_BASE_HEADER,
  resolvePublicSiteBasePath,
} from "@/lib/site-host";
import {
  buildOnboardingPath,
  buildOnboardingUrl,
  isOnboardingAppHost,
  ONBOARDING_SUBDOMAIN,
  onboardingInternalPath,
  parseOnboardingLocalPrefix,
} from "@/lib/onboarding-host";
import {
  readSiteDiscordCookies,
} from "@/lib/site-discord-auth";
import { DISCORD_SITE_DEFAULT_SCOPES } from "@/lib/page-access";
import {
  isAllowedLoginReturnTo,
  resolveLoginRedirectTarget,
} from "@/lib/login-redirect";

function isConvexAuthHttpPath(pathname: string) {
  return (
    pathname === "/callback/meridian" ||
    pathname === "/callback/discord" ||
    pathname === "/callback/onboarding" ||
    pathname.startsWith("/callback/discord/site") ||
    pathname.startsWith("/auth/discord/site") ||
    pathname.startsWith("/api/auth/signin/") ||
    pathname.startsWith("/api/auth/callback/") ||
    pathname.startsWith("/api/site-host/")
  );
}

const isLoginPage = createRouteMatcher(["/login"]);
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isOnboardingProtectedRoute = createRouteMatcher([
  "/onboarding/sites/config",
  "/onboarding/sites/config/(.*)",
]);

type SiteHostMeta = {
  hostKind?: "bot_subdomain" | "custom_slug";
  slug?: string;
};

async function fetchSiteHostMeta(
  origin: string,
  input: { slug?: string; siteId?: string; hostname?: string },
): Promise<SiteHostMeta | null> {
  const path = input.hostname
    ? `/api/site-host/by-hostname/${encodeURIComponent(input.hostname)}`
    : input.siteId
      ? `/api/site-host/by-id/${encodeURIComponent(input.siteId)}`
      : `/api/site-host/${encodeURIComponent(input.slug ?? "")}`;

  const result = (await fetch(`${origin}${path}`, {
    headers: { "x-middleware-request": "1" },
  }).then((res) => (res.ok ? res.json() : null))) as
    | (SiteHostMeta & { found?: boolean; slug?: string })
    | null;

  if (!result || result.found === false) {
    return null;
  }

  return result;
}

async function resolveLocalSubdomainMeta(
  origin: string,
  subdomainKey: string,
): Promise<{ hostMeta: SiteHostMeta; routingSlug: string } | null> {
  if (subdomainKey === ONBOARDING_SUBDOMAIN) {
    return null;
  }

  const bySlug = await fetchSiteHostMeta(origin, { slug: subdomainKey });
  if (bySlug) {
    return { hostMeta: bySlug, routingSlug: subdomainKey };
  }

  const byId = await fetchSiteHostMeta(origin, { siteId: subdomainKey });
  if (byId?.slug) {
    return { hostMeta: byId, routingSlug: byId.slug };
  }

  return null;
}

function rewriteSiteRequest(
  request: Request,
  siteSlug: string,
  subPath: string,
) {
  const url = new URL(request.url);
  const originalPathname = url.pathname;
  const internalPath =
    subPath === "/edit"
      ? `/sites/${siteSlug}/edit`
      : `/sites/${siteSlug}${subPath === "/" ? "" : subPath}`;
  url.pathname = internalPath;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    PUBLIC_SITE_BASE_HEADER,
    resolvePublicSiteBasePath(originalPathname),
  );

  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

function rewriteOnboardingRequest(request: Request, publicSubPath: string) {
  const url = new URL(request.url);
  url.pathname = onboardingInternalPath(publicSubPath);
  return NextResponse.rewrite(url);
}

function redirectToOnboardingLogin(request: Request, returnPath: string) {
  const loginPath = buildOnboardingPath("/sites/link");
  const loginUrl = new URL(loginPath, request.url);
  loginUrl.searchParams.set(
    "returnTo",
    buildOnboardingUrl(returnPath.startsWith("/") ? returnPath : `/${returnPath}`),
  );
  return NextResponse.redirect(loginUrl);
}

const proxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const pathname = url.pathname;

  if (
    pathname === "/dashboard/sites" &&
    url.searchParams.get("onboarding") === "1"
  ) {
    const target = new URL(buildOnboardingUrl("/sites/link"));
    const bot = url.searchParams.get("bot");
    if (bot) target.searchParams.set("bot", bot);
    return NextResponse.redirect(target);
  }

  if (isOnboardingAppHost(hostname)) {
    if (pathname === "/" || pathname === "") {
      return NextResponse.redirect(
        new URL(buildOnboardingPath("/sites/link"), request.url),
      );
    }
    return rewriteOnboardingRequest(request, pathname);
  }

  if (isLocalhostHostname(hostname)) {
    const onboardingLocal = parseOnboardingLocalPrefix(pathname);
    if (onboardingLocal) {
      if (onboardingLocal.subPath === "/" || onboardingLocal.subPath === "") {
        return NextResponse.redirect(
          new URL(buildOnboardingPath("/sites/link"), request.url),
        );
      }
      return rewriteOnboardingRequest(request, onboardingLocal.subPath);
    }

    const localSite = parseLocalSubdomainPath(pathname);
    if (localSite) {
      if (
        pathname.startsWith("/auth/discord/site") ||
        pathname.startsWith("/api/site-host/")
      ) {
        return NextResponse.next();
      }

      const subdomainKey = localSite.subdomainKey;
      const resolved = await resolveLocalSubdomainMeta(url.origin, subdomainKey);
      if (!resolved) {
        return NextResponse.next();
      }

      const { hostMeta, routingSlug } = resolved;
      const subPathSuffix =
        localSite.subPath === "/" ? "" : localSite.subPath;
      const returnTo = `${url.origin}/subdomain/${subdomainKey}${subPathSuffix}`;

      if (hostMeta.hostKind === "bot_subdomain") {
        const cookies = readSiteDiscordCookies(request.headers.get("cookie"));
        if (!cookies.discordUserId && !isSitePreviewPath(localSite.subPath)) {
          return NextResponse.redirect(
            `${url.origin}/auth/discord/site?slug=${encodeURIComponent(routingSlug)}&returnTo=${encodeURIComponent(returnTo)}&scopes=${encodeURIComponent(DISCORD_SITE_DEFAULT_SCOPES)}`,
          );
        }
        const response = rewriteSiteRequest(
          request,
          routingSlug,
          localSite.subPath,
        );
        if (cookies.discordUserId) {
          response.headers.set("x-dock-discord-user", cookies.discordUserId);
        }
        return response;
      }

      return rewriteSiteRequest(request, routingSlug, localSite.subPath);
    }
  }

  const siteSlug = parseSiteSlugFromHost(hostname);

  if (siteSlug && !isMainDockHost(hostname)) {
    if (
      pathname.startsWith("/auth/discord/site") ||
      pathname.startsWith("/api/site-host/")
    ) {
      return NextResponse.next();
    }

    const hostMeta = await fetchSiteHostMeta(url.origin, { slug: siteSlug });

    if (hostMeta?.hostKind === "bot_subdomain") {
      const cookies = readSiteDiscordCookies(request.headers.get("cookie"));
      if (!cookies.discordUserId) {
        const returnTo = `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}${pathname || "/"}`;
        return NextResponse.redirect(
          `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}/auth/discord/site?slug=${encodeURIComponent(siteSlug)}&returnTo=${encodeURIComponent(returnTo)}&scopes=${encodeURIComponent(DISCORD_SITE_DEFAULT_SCOPES)}`,
        );
      }
      const response = rewriteSiteRequest(request, siteSlug, pathname);
      if (cookies.discordUserId) {
        response.headers.set("x-dock-discord-user", cookies.discordUserId);
      }
      return response;
    }

    return rewriteSiteRequest(request, siteSlug, pathname);
  }

  if (isCustomDomainHost(hostname)) {
    if (
      pathname.startsWith("/auth/discord/site") ||
      pathname.startsWith("/callback/discord/site") ||
      pathname.startsWith("/api/site-host/")
    ) {
      return NextResponse.next();
    }

    const hostMeta = await fetchSiteHostMeta(url.origin, { hostname });
    if (!hostMeta?.slug) {
      return NextResponse.next();
    }

    const siteSlug = hostMeta.slug;

    if (hostMeta.hostKind === "bot_subdomain") {
      const cookies = readSiteDiscordCookies(request.headers.get("cookie"));
      if (!cookies.discordUserId && !isSitePreviewPath(pathname)) {
        const returnTo = `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}${pathname || "/"}`;
        return NextResponse.redirect(
          `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}/auth/discord/site?slug=${encodeURIComponent(siteSlug)}&returnTo=${encodeURIComponent(returnTo)}&scopes=${encodeURIComponent(DISCORD_SITE_DEFAULT_SCOPES)}`,
        );
      }
      const response = rewriteSiteRequest(request, siteSlug, pathname);
      if (cookies.discordUserId) {
        response.headers.set("x-dock-discord-user", cookies.discordUserId);
      }
      return response;
    }

    return rewriteSiteRequest(request, siteSlug, pathname);
  }

  if (pathname.startsWith("/onboarding")) {
    if (pathname === "/onboarding" || pathname === "/onboarding/") {
      return NextResponse.redirect(new URL("/onboarding/sites/link", request.url));
    }
  }

  if (
    isOnboardingProtectedRoute(request) &&
    !(await convexAuth.isAuthenticated())
  ) {
    const returnPath = pathname.replace(/^\/onboarding/, "") || "/sites/link";
    return redirectToOnboardingLogin(request, returnPath + url.search);
  }

  if (isLoginPage(request) && (await convexAuth.isAuthenticated())) {
    const returnTo = url.searchParams.get("returnTo")?.trim();
    if (returnTo && isAllowedLoginReturnTo(returnTo)) {
      return NextResponse.redirect(resolveLoginRedirectTarget(returnTo));
    }
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("returnTo", url.href);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}, {
  cookieConfig: { maxAge: 60 * 60 * 24 * 30 },
  shouldHandleCode(request) {
    return !isConvexAuthHttpPath(new URL(request.url).pathname);
  },
});

export default proxy;
export { proxy };

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
