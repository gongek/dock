import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import {
  publicSiteAccessErrorCode,
  SiteAccessErrorCode,
  siteAccessErrorPageUrl,
} from "@/lib/site-access-error";
import { NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim().toLowerCase();
  const returnToParam = url.searchParams.get("returnTo");
  const returnPath = url.searchParams.get("return") ?? "/";
  const scopes = url.searchParams.get("scopes")?.trim() || undefined;
  const origin = url.origin;

  if (!slug) {
    return NextResponse.redirect(
      await siteAccessErrorPageUrl(origin, SiteAccessErrorCode.InvalidLink),
    );
  }

  const returnTo =
    returnToParam?.trim() ||
    `${origin}${returnPath.startsWith("/") ? returnPath : `/${returnPath}`}`;

  try {
    const authorizeUrl = await convex.action(
      api.siteDiscordAuth.buildSiteDiscordAuthorizeUrl,
      {
        siteSlug: slug,
        returnTo,
        origin,
        scopes,
      },
    );
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const code = publicSiteAccessErrorCode(error);
    return NextResponse.redirect(
      await siteAccessErrorPageUrl(origin, code, { slug }),
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
