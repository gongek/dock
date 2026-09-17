import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { mergeUserAccounts } from "./lib/mergeUserAccounts";

export const mergeUserAccountsInternal = internalMutation({
  args: {
    primaryUserId: v.id("users"),
    secondaryUserId: v.id("users"),
    discordUserId: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    return await mergeUserAccounts(ctx, args);
  },
});
