import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { SITE_ACCESS_GRANT_TTL_MS } from "./lib/siteAccessCore";

export const assertSiteAccessGrant = query({
  args: {
    siteId: v.id("sites"),
    discordUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const grant = await ctx.db
      .query("siteAccessGrants")
      .withIndex("by_site_and_discord", (q) =>
        q.eq("siteId", args.siteId).eq("discordUserId", args.discordUserId),
      )
      .unique();
    if (!grant || grant.expiresAt <= Date.now()) {
      return { valid: false as const };
    }
    return { valid: true as const, expiresAt: grant.expiresAt };
  },
});

export const isSiteOwnerByDiscord = query({
  args: {
    siteId: v.id("sites"),
    discordUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site?.meridianBotId) return false;
    const mockBot = await ctx.db
      .query("meridianMockBots")
      .withIndex("by_meridian_bot_id", (q) => q.eq("meridianBotId", site.meridianBotId!))
      .unique();
    if (!mockBot) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_discord_id", (q) => q.eq("discordId", args.discordUserId))
      .unique();
    return !!user && mockBot.ownerUserId === user._id;
  },
});

export const upsertSiteAccessGrantInternal = internalMutation({
  args: {
    siteId: v.id("sites"),
    discordUserId: v.string(),
    meridianUserId: v.optional(v.id("users")),
    allowed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("siteAccessGrants")
      .withIndex("by_site_and_discord", (q) =>
        q.eq("siteId", args.siteId).eq("discordUserId", args.discordUserId),
      )
      .unique();

    if (!args.allowed) {
      if (existing) await ctx.db.delete(existing._id);
      throw new Error("You do not have access to this staff panel.");
    }

    const expiresAt = Date.now() + SITE_ACCESS_GRANT_TTL_MS;
    if (existing) {
      await ctx.db.patch(existing._id, {
        meridianUserId: args.meridianUserId,
        expiresAt,
      });
    } else {
      await ctx.db.insert("siteAccessGrants", {
        siteId: args.siteId,
        discordUserId: args.discordUserId,
        meridianUserId: args.meridianUserId,
        expiresAt,
        createdAt: Date.now(),
      });
    }
    return { expiresAt };
  },
});

export const getSiteAccessSettings = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    return site?.accessSettings ?? null;
  },
});
