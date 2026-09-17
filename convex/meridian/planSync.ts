import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalMutation, type MutationCtx } from "../_generated/server";
import { ownerPlanAfterMeridianEntitlements } from "../lib/meridianPlan";
import { normalizeOwnerPlan, type OwnerPlan } from "../lib/siteLimits";
import { resolveMeridianUserPlan } from "./userinfo";

const meridianPlanValidator = v.union(
  v.literal("free"),
  v.literal("hobby"),
  v.literal("pro"),
  v.literal("max"),
  v.literal("enterprise"),
  v.null(),
);

async function applyMeridianPlanEntitlements(
  ctx: MutationCtx,
  userId: Id<"users">,
  meridianPlan: OwnerPlan | null,
  isMeridianStaff: boolean,
) {
  const user = await ctx.db.get(userId);
  if (!user) {
    return;
  }

  const currentPlan = normalizeOwnerPlan(user.ownerPlan);
  const nextPlan = ownerPlanAfterMeridianEntitlements(
    currentPlan,
    meridianPlan,
    isMeridianStaff,
  );

  if (nextPlan !== currentPlan) {
    await ctx.db.patch(user._id, { ownerPlan: nextPlan });
  }
}

export const syncOwnerPlanOnMeridianLogin = internalMutation({
  args: {
    providerAccountId: v.string(),
    meridianPlan: meridianPlanValidator,
    isMeridianStaff: v.boolean(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "meridian").eq("providerAccountId", args.providerAccountId),
      )
      .unique();

    if (!account) {
      return;
    }

    await applyMeridianPlanEntitlements(
      ctx,
      account.userId,
      args.meridianPlan as OwnerPlan | null,
      args.isMeridianStaff,
    );
  },
});

export const syncOwnerPlanForUser = internalMutation({
  args: {
    userId: v.id("users"),
    meridianPlan: meridianPlanValidator,
    isMeridianStaff: v.boolean(),
  },
  handler: async (ctx, args) => {
    await applyMeridianPlanEntitlements(
      ctx,
      args.userId,
      args.meridianPlan as OwnerPlan | null,
      args.isMeridianStaff,
    );
  },
});

export const syncCurrentUserMeridianPlan = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const authContext = await ctx.runQuery(
      internal.meridian.tokens.getMeridianAuthContext,
      {},
    );

    if (!authContext.accessToken || !authContext.userId) {
      return null;
    }

    try {
      const { plan, isMeridianStaff } = await resolveMeridianUserPlan(
        authContext.accessToken,
      );
      await ctx.runMutation(internal.meridian.planSync.syncOwnerPlanForUser, {
        userId: authContext.userId,
        meridianPlan: plan,
        isMeridianStaff,
      });
    } catch {
      return null;
    }

    return null;
  },
});
