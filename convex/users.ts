import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { normalizeOwnerPlan } from "./lib/siteLimits";

export const currentUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      image: v.optional(v.string()),
      meridianId: v.optional(v.string()),
      discordId: v.optional(v.string()),
      ownerPlan: v.union(
        v.literal("free"),
        v.literal("hobby"),
        v.literal("pro"),
        v.literal("max"),
        v.literal("enterprise"),
      ),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      image: user.image,
      meridianId: user.meridianId,
      discordId: user.discordId,
      ownerPlan: normalizeOwnerPlan(user.ownerPlan),
    };
  },
});
