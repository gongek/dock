import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

export const getFocusSiteContext = internalQuery({
  args: { siteId: v.optional(v.id("sites")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const sites = await ctx.db
      .query("sites")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", user._id))
      .collect();
    sites.sort((a, b) => b.updatedAt - a.updatedAt);

    const siteOptions = sites.map((site) => ({
      _id: site._id,
      title: site.title,
      meridianBotId: site.meridianBotId,
      status: site.status,
    }));

    if (sites.length === 0) {
      return { siteOptions, focusSite: null, caseStats: null };
    }

    let focus =
      sites.find((site) => site.meridianBotId) ?? sites[0] ?? null;
    if (args.siteId) {
      const picked = sites.find((site) => site._id === args.siteId);
      if (picked) {
        focus = picked;
      }
    }

    if (!focus) {
      return { siteOptions, focusSite: null, caseStats: null };
    }

    const records = await ctx.db
      .query("siteCaseRecords")
      .withIndex("by_site", (q) => q.eq("siteId", focus._id))
      .collect();
    const now = Date.now();
    let activeCases = 0;
    for (const row of records) {
      if (row.revokedAt != null) continue;
      if (row.expiresAt != null && row.expiresAt <= now) continue;
      activeCases += 1;
    }

    return {
      siteOptions,
      focusSite: {
        _id: focus._id,
        title: focus.title,
        slug: focus.slug,
        status: focus.status,
        hostKind: focus.hostKind,
        meridianBotId: focus.meridianBotId,
        botName: focus.botName,
        linkedGuildId: focus.linkedGuildId,
      },
      caseStats: {
        total: records.length,
        active: activeCases,
      },
    };
  },
});
