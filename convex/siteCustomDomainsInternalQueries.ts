import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { getCurrentUserOrNull } from "./lib/auth";
import type { Doc } from "./_generated/dataModel";
import type { SiteCustomDomainRecord } from "./lib/siteCustomDomainTypes";

function toDomainRecord(domain: Doc<"siteCustomDomains">): SiteCustomDomainRecord {
  return {
    _id: domain._id,
    siteId: domain.siteId,
    hostname: domain.hostname,
    status: domain.status,
    sslStatus: domain.sslStatus,
    verificationJson: domain.verificationJson,
    lastError: domain.lastError,
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
    verifiedAt: domain.verifiedAt,
  };
}

export const getCurrentUserForAction = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserOrNull(ctx);
  },
});

export const getOwnedSiteForAction = internalQuery({
  args: {
    siteId: v.id("sites"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site || site.ownerUserId !== args.userId) {
      return null;
    }
    return site;
  },
});

export const getOwnedDomainForAction = internalQuery({
  args: {
    domainId: v.id("siteCustomDomains"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (!domain) return null;
    const site = await ctx.db.get(domain.siteId);
    if (!site || site.ownerUserId !== args.userId) {
      return null;
    }
    return domain;
  },
});

export const getDomainById = internalQuery({
  args: { domainId: v.id("siteCustomDomains") },
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (!domain) return null;
    return toDomainRecord(domain);
  },
});

export const getDomainByHostnameLower = internalQuery({
  args: { hostnameLower: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("siteCustomDomains")
      .withIndex("by_hostname_lower", (q) => q.eq("hostnameLower", args.hostnameLower))
      .unique();
  },
});

export const listDomainCountForSite = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const domains = await ctx.db
      .query("siteCustomDomains")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    return domains.length;
  },
});
