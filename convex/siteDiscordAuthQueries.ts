import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDiscordSession = query({
  args: { discordUserId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      discordUserId: v.string(),
      expiresAt: v.number(),
      username: v.optional(v.string()),
      globalName: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("siteDiscordSessions")
      .withIndex("by_discord_user", (q) => q.eq("discordUserId", args.discordUserId))
      .unique();
    if (!session || session.expiresAt <= Date.now()) return null;
    return {
      discordUserId: session.discordUserId,
      expiresAt: session.expiresAt,
      ...(session.username ? { username: session.username } : {}),
      ...(session.globalName ? { globalName: session.globalName } : {}),
      ...(session.avatarUrl ? { avatarUrl: session.avatarUrl } : {}),
    };
  },
});
