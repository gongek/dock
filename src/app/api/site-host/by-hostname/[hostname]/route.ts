import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  _request: Request,
  context: { params: Promise<{ hostname: string }> },
) {
  const { hostname: rawHostname } = await context.params;
  const hostname = decodeURIComponent(rawHostname).trim();
  if (!hostname) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  const site = await convex.query(api.siteCustomDomains.getSiteByCustomHostname, {
    hostname,
  });
  if (!site) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  return NextResponse.json({
    found: true,
    hostKind: site.hostKind,
    siteId: site.siteId,
    slug: site.slug,
  });
}
