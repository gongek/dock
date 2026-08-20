import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { hasUsableEmail, sanitizeUserProfile } from "./userProfile";

const PENDING_SIGNUP_TTL_MS = 1000 * 60 * 15;

export const createPending = internalMutation({
  args: {
    token: v.string(),
    providerAccountId: v.string(),
    profile: v.any(),
    signature: v.string(),
    redirectTo: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pendingDiscordSignups")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    await ctx.db.insert("pendingDiscordSignups", {
      ...args,
      profile: sanitizeUserProfile(
        (args.profile ?? {}) as Record<string, unknown>,
        "discord",
      ),
      expirationTime: Date.now() + PENDING_SIGNUP_TTL_MS,
    });
    return null;
  },
});

export const getExistingDiscordUser = internalQuery({
  args: { providerAccountId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      accountId: v.id("authAccounts"),
      userId: v.union(v.null(), v.id("users")),
    }),
  ),
  handler: async (ctx, { providerAccountId }) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "discord").eq("providerAccountId", providerAccountId),
      )
      .unique();
    if (!account) {
      return null;
    }
    const user = await ctx.db.get(account.userId);
    return {
      accountId: account._id,
      userId: user?._id ?? null,
    };
  },
});

export const readPending = internalMutation({
  args: {
    token: v.string(),
    email: v.string(),
  },
  returns: v.object({
    providerAccountId: v.string(),
    profile: v.any(),
    signature: v.string(),
    redirectTo: v.string(),
    email: v.string(),
  }),
  handler: async (ctx, { token, email }) => {
    if (!hasUsableEmail(email)) {
      throw new Error("Please enter a valid email address.");
    }
    const normalized = email.trim().toLowerCase();

    const pending = await ctx.db
      .query("pendingDiscordSignups")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!pending || pending.expirationTime < Date.now()) {
      throw new Error("This sign-up link expired. Start Discord login again.");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalized))
      .unique();

    if (existing) {
      throw new Error("That email is already in use.");
    }

    return {
      providerAccountId: pending.providerAccountId,
      profile: pending.profile,
      signature: pending.signature,
      redirectTo: pending.redirectTo,
      email: normalized,
    };
  },
});

export const deletePending = internalMutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, { token }) => {
    const pending = await ctx.db
      .query("pendingDiscordSignups")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (pending) {
      await ctx.db.delete(pending._id);
    }
    return null;
  },
});

export const completeDiscordSignup = action({
  args: {
    token: v.string(),
    email: v.string(),
  },
  returns: v.object({
    redirectTo: v.string(),
    code: v.string(),
  }),
  handler: async (ctx, args): Promise<{ redirectTo: string; code: string }> => {
    const pending = await ctx.runMutation(
      internal.discordSignup.readPending,
      args,
    );
    const profile = sanitizeUserProfile(
      {
        ...(pending.profile as Record<string, unknown>),
        email: pending.email,
        discordId: pending.providerAccountId,
      },
      "discord",
    );
    const code = (await ctx.runMutation(internal.auth.store, {
      args: {
        type: "userOAuth",
        provider: "discord",
        providerAccountId: pending.providerAccountId,
        profile,
        signature: pending.signature,
      },
    })) as string;
    await ctx.runMutation(internal.discordSignup.deletePending, {
      token: args.token,
    });
    return {
      redirectTo: pending.redirectTo,
      code,
    };
  },
});
