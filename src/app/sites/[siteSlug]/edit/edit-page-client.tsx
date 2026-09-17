"use client";

import { SiteBuilderLoader } from "@/components/builder/site-builder-loader";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function BotSubdomainEditPage({
  siteId,
}: {
  siteId: Id<"sites">;
}) {
  return <SiteBuilderLoader siteId={siteId} />;
}
