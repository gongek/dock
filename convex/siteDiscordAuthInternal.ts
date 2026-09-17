import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getSiteBySlugInternal = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slugLower = args.slug.trim().toLowerCase();
    return (
      (await ctx.db
        .query("sites")
        .withIndex("by_slug_lower", (q) => q.eq("slugLower", slugLower))
        .unique()) ?? null
    );
  },
});

export const getSiteByIdInternal = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    return (await ctx.db.get(args.siteId)) ?? null;
  },
});

export const getMockBotInternal = internalQuery({
  args: { meridianBotId: v.string() },
  handler: async (ctx, args) => {
    return (
      (await ctx.db
        .query("meridianMockBots")
        .withIndex("by_meridian_bot_id", (q) =>
          q.eq("meridianBotId", args.meridianBotId),
        )
        .unique()) ?? null
    );
  },
});

export const getUserByIdInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return (await ctx.db.get(args.userId)) ?? null;
  },
});

export const getUserByDiscordIdInternal = internalQuery({
  args: { discordUserId: v.string() },
  handler: async (ctx, args) => {
    return (
      (await ctx.db
        .query("users")
        .withIndex("by_discord_id", (q) => q.eq("discordId", args.discordUserId))
        .unique()) ?? null
    );
  },
});

export const linkDiscordIdToOwnerInternal = internalMutation({
  args: {
    userId: v.id("users"),
    discordUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found.");
    }
    if (user.discordId && user.discordId !== args.discordUserId) {
      throw new Error("This Dock account is already linked to another Discord account.");
    }
    if (!user.discordId) {
      await ctx.db.patch(args.userId, { discordId: args.discordUserId });
    }
  },
});

export const storeDiscordSessionInternal = internalMutation({
  args: {
    discordUserId: v.string(),
    accessToken: v.string(),
    expiresIn: v.number(),
    username: v.optional(v.string()),
    globalName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("siteDiscordSessions")
      .withIndex("by_discord_user", (q) => q.eq("discordUserId", args.discordUserId))
      .unique();
    const expiresAt = Date.now() + args.expiresIn * 1000;
    const payload = {
      accessTokenEnc: args.accessToken,
      expiresAt,
      username: args.username,
      globalName: args.globalName,
      avatarUrl: args.avatarUrl,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("siteDiscordSessions", {
      discordUserId: args.discordUserId,
      ...payload,
      createdAt: Date.now(),
    });
  },
});
