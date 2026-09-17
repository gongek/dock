import { NextResponse } from "next/server";
import { proxyConvexHttp } from "@/lib/convex-http-proxy";
import { parseSiteDiscordOAuthState } from "@/lib/site-discord-oauth-state";

function redirectToSiteDiscordCompletion(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state")?.trim() ?? "";
  const code = url.searchParams.get("code")?.trim() ?? "";
  const parsedState = parseSiteDiscordOAuthState(state);
  if (!parsedState || !code) {
    return null;
  }

  const completionUrl = new URL("/callback/discord/site", parsedState.origin);
  completionUrl.searchParams.set("code", code);
  completionUrl.searchParams.set("state", state);
  return NextResponse.redirect(completionUrl.toString());
}

export function GET(request: Request) {
  const siteCompletion = redirectToSiteDiscordCompletion(request);
  if (siteCompletion) {
    return siteCompletion;
  }
  return proxyConvexHttp(request, "/callback/discord", "discord");
}

export function POST(request: Request) {
  const siteCompletion = redirectToSiteDiscordCompletion(request);
  if (siteCompletion) {
    return siteCompletion;
  }
  return proxyConvexHttp(request, "/callback/discord", "discord");
}
