import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { formatDockPlanLabel } from "@/lib/pricing";

type SitesListData = FunctionReturnType<typeof api.sites.listMySites>;

export function formatSitesPageDescription(data: SitesListData): string {
  const count = data.sites.length;
  const planLabel = formatDockPlanLabel(data.plan);
  const siteWord = count === 1 ? "site" : "sites";
  const parts = [`${count} ${siteWord}`, planLabel];

  const draftCount = data.sites.filter((site) => site.status === "draft").length;
  if (draftCount > 0) {
    parts.push(`${draftCount} draft${draftCount === 1 ? "" : "s"}`);
  }

  if (data.maxSites !== null && data.maxSites !== undefined) {
    const left = data.maxSites - count;
    if (left <= 0) {
      parts.push("limit reached");
    } else if (left <= 2) {
      parts.push(`${left} slot${left === 1 ? "" : "s"} left`);
    }
  }

  return parts.join(" · ");
}
