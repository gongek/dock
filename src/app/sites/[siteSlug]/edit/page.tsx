import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import BotSubdomainEditPage from "./edit-page-client";

export const dynamic = "force-dynamic";

export default async function SiteEditRoute({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await fetchQuery(api.sites.getSiteBySlug, { slug: siteSlug });
  if (!site) {
    return <p className="p-6 text-sm text-zinc-500">Site not found.</p>;
  }
  return <BotSubdomainEditPage siteId={site._id} />;
}
