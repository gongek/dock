import { NextResponse } from "next/server";
import { proxyConvexHttp } from "@/lib/convex-http-proxy";
import { buildOnboardingUrl } from "@/lib/onboarding-host";

const SITE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function isLocalCallbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function normalizeSiteSlug(raw: string): string | null {
  const slug = raw.trim().toLowerCase();
  if (!slug || !SITE_SLUG_RE.test(slug)) return null;
  return slug;
}

function handleOnboardingSelectCallback(request: Request): Response {
  const url = new URL(request.url);
  const meridianError = url.searchParams.get("error")?.trim();
  const botRaw = url.searchParams.get("bot")?.trim();

  const linkDestination = () => new URL(buildOnboardingUrl("/sites/link"));

  if (meridianError) {
    const destination = linkDestination();
    destination.searchParams.set("error", meridianError);
    return NextResponse.redirect(destination);
  }

  const bot = botRaw ? normalizeSiteSlug(botRaw) : null;
  if (!bot) {
    const destination = linkDestination();
    destination.searchParams.set("error", "missing_bot");
    return NextResponse.redirect(destination);
  }

  const destination = new URL(buildOnboardingUrl("/sites/config"));
  destination.searchParams.set("bot", bot);
  return NextResponse.redirect(destination);
}

function routeOnboardingCallback(request: Request): Response | Promise<Response> {
  const hostname = new URL(request.url).hostname;
  if (isLocalCallbackHost(hostname)) {
    return handleOnboardingSelectCallback(request);
  }
  return proxyConvexHttp(request, "/callback/onboarding");
}

export function GET(request: Request) {
  return routeOnboardingCallback(request);
}

export function POST(request: Request) {
  return routeOnboardingCallback(request);
}
