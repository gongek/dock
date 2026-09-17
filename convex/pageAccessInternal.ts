import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const getDiscordSessionInternal = internalQuery({
  args: { discordUserId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("siteDiscordSessions")
      .withIndex("by_discord_user", (q) => q.eq("discordUserId", args.discordUserId))
      .unique();
    if (!session || session.expiresAt <= Date.now()) return null;
    return session;
  },
});

export const getPageBySlugInternal = internalQuery({
  args: {
    siteId: v.id("sites"),
    pageSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const slugLower = args.pageSlug.trim().toLowerCase();
    return (
      (await ctx.db
        .query("sitePages")
        .withIndex("by_site_and_slug", (q) =>
          q.eq("siteId", args.siteId).eq("slugLower", slugLower),
        )
        .unique()) ?? null
    );
  },
});
