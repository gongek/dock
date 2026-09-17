import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { hasUsableEmail } from "../userProfile";
import { normalizeOwnerPlan, pickBetterOwnerPlan } from "./siteLimits";

export async function mergeUserAccounts(
  ctx: MutationCtx,
  args: {
    primaryUserId: Id<"users">;
    secondaryUserId: Id<"users">;
    discordUserId?: string;
  },
): Promise<Id<"users">> {
  if (args.primaryUserId === args.secondaryUserId) {
    return args.primaryUserId;
  }

  const primary = await ctx.db.get(args.primaryUserId);
  const secondary = await ctx.db.get(args.secondaryUserId);
  if (!primary || !secondary) {
    throw new Error("User not found.");
  }

  if (
    primary.meridianId &&
    secondary.meridianId &&
    primary.meridianId !== secondary.meridianId
  ) {
    throw new Error(
      "These Dock profiles are linked to different Meridian accounts and cannot be merged automatically.",
    );
  }

  if (secondary.discordId) {
    await ctx.db.patch(args.secondaryUserId, { discordId: undefined });
  }

  const mergedProfile: Partial<Doc<"users">> = {};
  if (args.discordUserId) {
    mergedProfile.discordId = args.discordUserId;
  } else if (!primary.discordId && secondary.discordId) {
    mergedProfile.discordId = secondary.discordId;
  }
  if (!primary.meridianId && secondary.meridianId) {
    mergedProfile.meridianId = secondary.meridianId;
  }
  if (!hasUsableEmail(primary.email) && hasUsableEmail(secondary.email)) {
    mergedProfile.email = secondary.email;
    mergedProfile.emailVerificationTime =
      secondary.emailVerificationTime ?? Date.now();
  }
  if (!primary.name?.trim() && secondary.name?.trim()) {
    mergedProfile.name = secondary.name;
  }
  if (!primary.image?.trim() && secondary.image?.trim()) {
    mergedProfile.image = secondary.image;
  }

  const betterPlan = pickBetterOwnerPlan(primary.ownerPlan, secondary.ownerPlan);
  if (betterPlan !== normalizeOwnerPlan(primary.ownerPlan)) {
    mergedProfile.ownerPlan = betterPlan;
  }

  if (Object.keys(mergedProfile).length > 0) {
    await ctx.db.patch(args.primaryUserId, mergedProfile);
  }

  const secondaryAccounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", args.secondaryUserId))
    .collect();
  for (const account of secondaryAccounts) {
    const primaryAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", args.primaryUserId).eq("provider", account.provider),
      )
      .unique();
    if (primaryAccount) {
      await ctx.db.delete(account._id);
    } else {
      await ctx.db.patch(account._id, { userId: args.primaryUserId });
    }
  }

  const secondarySessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", args.secondaryUserId))
    .collect();
  for (const session of secondarySessions) {
    await ctx.db.patch(session._id, { userId: args.primaryUserId });
  }

  const primaryToken = await ctx.db
    .query("meridianOAuthTokens")
    .withIndex("by_user", (q) => q.eq("userId", args.primaryUserId))
    .unique();
  const secondaryToken = await ctx.db
    .query("meridianOAuthTokens")
    .withIndex("by_user", (q) => q.eq("userId", args.secondaryUserId))
    .unique();
  if (!primaryToken && secondaryToken) {
    await ctx.db.patch(secondaryToken._id, { userId: args.primaryUserId });
  } else if (secondaryToken) {
    await ctx.db.delete(secondaryToken._id);
  }

  const secondarySites = await ctx.db
    .query("sites")
    .withIndex("by_owner", (q) => q.eq("ownerUserId", args.secondaryUserId))
    .collect();
  for (const site of secondarySites) {
    await ctx.db.patch(site._id, { ownerUserId: args.primaryUserId });
  }

  const secondaryBots = await ctx.db
    .query("meridianMockBots")
    .withIndex("by_owner", (q) => q.eq("ownerUserId", args.secondaryUserId))
    .collect();
  for (const bot of secondaryBots) {
    await ctx.db.patch(bot._id, { ownerUserId: args.primaryUserId });
  }

  const allBots = await ctx.db.query("meridianMockBots").collect();
  for (const bot of allBots) {
    if (!bot.collaboratorUserIds?.includes(args.secondaryUserId)) {
      continue;
    }
    const collaboratorUserIds = [
      ...new Set(
        bot.collaboratorUserIds
          .filter((userId) => userId !== args.secondaryUserId)
          .concat(args.primaryUserId),
      ),
    ];
    await ctx.db.patch(bot._id, { collaboratorUserIds });
  }

  const grants = await ctx.db.query("siteAccessGrants").collect();
  for (const grant of grants) {
    if (grant.meridianUserId === args.secondaryUserId) {
      await ctx.db.patch(grant._id, { meridianUserId: args.primaryUserId });
    }
  }

  await ctx.db.delete(args.secondaryUserId);
  return args.primaryUserId;
}
