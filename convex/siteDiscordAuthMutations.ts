import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { buildSiteDiscordAuthorizeUrlForState } from "./lib/buildSiteDiscordAuthorizeUrl";
import { getCurrentUserOrNull } from "./lib/auth";
import { signSiteOwnerClaim } from "./lib/siteOwnerClaim";

export const beginSiteDiscordAuth = mutation({
  args: {
    siteSlug: v.string(),
    returnTo: v.string(),
    origin: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    const slugLower = args.siteSlug.trim().toLowerCase();
    const site = await ctx.db
      .query("sites")
      .withIndex("by_slug_lower", (q) => q.eq("slugLower", slugLower))
      .unique();

    const origin = args.origin.trim().replace(/\/$/, "");
    const siteSlug = args.siteSlug.trim().toLowerCase();
    const dockUserId =
      user && site?.ownerUserId === user._id ? user._id : undefined;
    const ownerSig = dockUserId
      ? await signSiteOwnerClaim({ siteSlug, origin, dockUserId })
      : undefined;

    return buildSiteDiscordAuthorizeUrlForState({
      siteSlug: args.siteSlug,
      returnTo: args.returnTo,
      origin: args.origin,
      dockUserId,
      ownerSig,
    });
  },
});
