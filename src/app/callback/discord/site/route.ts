import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { siteDiscordCookieHeader } from "@/lib/site-discord-auth";
import {
  publicSiteAccessErrorCode,
  SiteAccessErrorCode,
  siteAccessErrorPageUrl,
} from "@/lib/site-access-error";
import { NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim() ?? "";
  const state = url.searchParams.get("state")?.trim() ?? "";

  if (!code || !state) {
    return NextResponse.redirect(
      await siteAccessErrorPageUrl(
        url.origin,
        SiteAccessErrorCode.DiscordCancelled,
      ),
    );
  }

  try {
    const result = await convex.action(
      api.siteDiscordAuth.completeSiteDiscordOAuthAction,
      {
        code,
        state,
      },
    );
    const response = NextResponse.redirect(result.returnTo);
    const cookie = siteDiscordCookieHeader({
      discordUserId: result.discordUserId,
      accessToken: result.accessToken,
    });
    for (const part of cookie.split(", ")) {
      response.headers.append("Set-Cookie", part);
    }
    return response;
  } catch (error) {
    const errorCode = publicSiteAccessErrorCode(error);
    return NextResponse.redirect(
      await siteAccessErrorPageUrl(url.origin, errorCode),
    );
  }
}
