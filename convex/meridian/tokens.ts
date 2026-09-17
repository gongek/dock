import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, type QueryCtx } from "../_generated/server";
import { getCurrentUserOrNull } from "../lib/auth";

export const upsertTokenByProviderAccount = internalMutation({
  args: {
    providerAccountId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "meridian").eq("providerAccountId", args.providerAccountId),
      )
      .unique();

    if (!account) {
      throw new Error("Meridian account not found after sign-in.");
    }

    const existing = await ctx.db
      .query("meridianOAuthTokens")
      .withIndex("by_user", (q) => q.eq("userId", account.userId))
      .unique();

    const now = Date.now();
    const tokenData = {
      userId: account.userId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, tokenData);
      return existing._id;
    }

    return await ctx.db.insert("meridianOAuthTokens", tokenData);
  },
});

async function meridianAuthContextForUser(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  const tokenRecord = await ctx.db
    .query("meridianOAuthTokens")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  return {
    meridianConnected: Boolean(user?.meridianId),
    userId,
    accessToken: tokenRecord?.accessToken ?? null,
    refreshToken: tokenRecord?.refreshToken ?? null,
    expiresAt: tokenRecord?.expiresAt ?? null,
  };
}

export const getMeridianAuthContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return {
        meridianConnected: false,
        userId: null as Id<"users"> | null,
        accessToken: null as string | null,
        refreshToken: null as string | null,
        expiresAt: null as number | null,
      };
    }

    return meridianAuthContextForUser(ctx, user._id);
  },
});

export const getMeridianAuthContextForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => meridianAuthContextForUser(ctx, args.userId),
});

export const patchTokenForUser = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("meridianOAuthTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const now = Date.now();
    const tokenData = {
      userId: args.userId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, tokenData);
      return;
    }

    await ctx.db.insert("meridianOAuthTokens", tokenData);
  },
});
