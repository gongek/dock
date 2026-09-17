import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUser } from "../lib/auth";
import { normalizeSiteSlug } from "../lib/siteValidators";

export const listBotsForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const owned = await ctx.db
      .query("meridianMockBots")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", user._id))
      .collect();

    const all = await ctx.db.query("meridianMockBots").collect();
    const collaborated = all.filter((bot) =>
      bot.collaboratorUserIds?.includes(user._id),
    );

    const byId = new Map<string, (typeof owned)[number]>();
    for (const bot of [...owned, ...collaborated]) {
      byId.set(bot.meridianBotId, bot);
    }
    return [...byId.values()].map((bot) => ({
      meridianBotId: bot.meridianBotId,
      label: bot.label,
      name: bot.name,
      linkedGuildId: bot.linkedGuildId,
    }));
  },
});

export const ensureDefaultMockBot = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("meridianMockBots")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", user._id))
      .first();
    if (existing) {
      return {
        meridianBotId: existing.meridianBotId,
        label: existing.label,
        name: existing.name,
        linkedGuildId: existing.linkedGuildId,
      };
    }

    const labelBase = user.name?.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "mybot";
    const label = normalizeSiteSlug(labelBase) ?? "mybot";
    const meridianBotId = `mock_${user._id}`;
    const now = Date.now();
    await ctx.db.insert("meridianMockBots", {
      meridianBotId,
      label,
      labelLower: label,
      name: user.name?.trim() || "My bot",
      ownerUserId: user._id,
      linkedGuildId: user.discordId ? "123456789012345678" : undefined,
      collaboratorUserIds: [],
      createdAt: now,
    });
    return {
      meridianBotId,
      label,
      name: user.name?.trim() || "My bot",
      linkedGuildId: user.discordId ? "123456789012345678" : undefined,
    };
  },
});

export const getMockBotByMeridianId = query({
  args: { label: v.string() },
  handler: async (ctx, args) => {
    const labelLower = args.label.trim().toLowerCase();
    return (
      (await ctx.db
        .query("meridianMockBots")
        .withIndex("by_label_lower", (q) => q.eq("labelLower", labelLower))
        .unique()) ?? null
    );
  },
});
