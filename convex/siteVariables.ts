import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";

function templateVarsFromRows(
  rows: Array<{
    key: string;
    defaultValue: string;
    source: "manual" | "meridian_case" | "meridian_storage";
    updatedAt: number;
  }>,
): { vars: Record<string, string>; newestUpdatedAt: number } {
  const vars: Record<string, string> = {};
  let newestUpdatedAt = 0;
  for (const row of rows) {
    newestUpdatedAt = Math.max(newestUpdatedAt, row.updatedAt);
    if (row.source === "meridian_storage" || row.source === "manual") {
      vars[row.key] = row.defaultValue;
    }
  }
  return { vars, newestUpdatedAt };
}

export const getTemplateVarsForSite = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("siteVariables")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    return templateVarsFromRows(rows).vars;
  },
});

export const readTemplateVarCache = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    const rows = await ctx.db
      .query("siteVariables")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    const { vars, newestUpdatedAt } = templateVarsFromRows(rows);

    if (!site) {
      return { site: null, vars, newestUpdatedAt };
    }

    return {
      site: {
        ownerUserId: site.ownerUserId,
        meridianBotId: site.meridianBotId?.trim() ?? "",
        linkedGuildId: site.linkedGuildId,
      },
      vars,
      newestUpdatedAt,
    };
  },
});
