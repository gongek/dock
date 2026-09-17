"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { buildSiteDiscordAuthorizeUrlForState } from "./lib/buildSiteDiscordAuthorizeUrl";
import { completeSiteDiscordOAuth } from "./lib/completeSiteDiscordOAuth";
import { parseSiteDiscordOAuthState } from "./lib/siteDiscordState";

export const buildSiteDiscordAuthorizeUrl = action({
  args: {
    siteSlug: v.string(),
    returnTo: v.string(),
    origin: v.string(),
    scopes: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (_ctx, args) => {
    return buildSiteDiscordAuthorizeUrlForState({
      siteSlug: args.siteSlug,
      returnTo: args.returnTo,
      origin: args.origin,
      scopes: args.scopes,
    });
  },
});

export const completeSiteDiscordOAuthAction = action({
  args: {
    code: v.string(),
    state: v.string(),
  },
  returns: v.object({
    siteId: v.id("sites"),
    siteSlug: v.string(),
    returnTo: v.string(),
    discordUserId: v.string(),
    accessToken: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const parsed = parseSiteDiscordOAuthState(args.state);
    if (!parsed) {
      throw new Error("Invalid OAuth state.");
    }
    return await completeSiteDiscordOAuth(ctx, {
      code: args.code,
      state: parsed,
    });
  },
});
