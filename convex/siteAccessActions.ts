"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { evaluateSiteAccess } from "./lib/siteAccessCore";

export const refreshSiteAccessGrant = action({
  args: {
    siteId: v.id("sites"),
    discordUserId: v.string(),
    accessToken: v.string(),
  },
  returns: v.object({ expiresAt: v.number() }),
  handler: async (ctx, args): Promise<{ expiresAt: number }> => {
    const site = await ctx.runQuery(internal.siteDiscordAuthInternal.getSiteByIdInternal, {
      siteId: args.siteId,
    });
    if (!site) throw new Error("Site not found.");

    const mockBot = site.meridianBotId
      ? await ctx.runQuery(internal.siteDiscordAuthInternal.getMockBotInternal, {
          meridianBotId: site.meridianBotId,
        })
      : null;
    const meridianUser = await ctx.runQuery(
      internal.siteDiscordAuthInternal.getUserByDiscordIdInternal,
      { discordUserId: args.discordUserId },
    );

    const result = await evaluateSiteAccess({
      site,
      mockBot,
      meridianUser,
      accessToken: args.accessToken,
    });

    return await ctx.runMutation(internal.siteAccess.upsertSiteAccessGrantInternal, {
      siteId: args.siteId,
      discordUserId: args.discordUserId,
      meridianUserId: result.meridianUserId,
      allowed: result.allowed,
    });
  },
});
