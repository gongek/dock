import { SiteBuilderLoader } from "@/components/builder/site-builder-loader";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  return <SiteBuilderLoader siteId={siteId as Id<"sites">} />;
}
