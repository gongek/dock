import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUserOrNull } from "./lib/auth";
import {
  canUseCustomDomain,
  maxCustomDomainsForPlan,
  normalizeOwnerPlan,
} from "./lib/siteLimits";
import { isCustomDomainsConfigured } from "./lib/customDomainsConfig";
import { normalizeCustomDomainHostname } from "./lib/customDomainValidators";

const domainRecordValidator = v.object({
  _id: v.id("siteCustomDomains"),
  siteId: v.id("sites"),
  hostname: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("active"),
    v.literal("failed"),
  ),
  sslStatus: v.optional(v.string()),
  verificationJson: v.optional(v.string()),
  lastError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  verifiedAt: v.optional(v.number()),
});

export const listForSite = query({
  args: { siteId: v.id("sites") },
  returns: v.object({
    canUseCustomDomain: v.boolean(),
    customDomainsConfigured: v.boolean(),
    canAddCustomDomain: v.boolean(),
    maxCustomDomains: v.number(),
    domains: v.array(domainRecordValidator),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return {
        canUseCustomDomain: false,
        customDomainsConfigured: isCustomDomainsConfigured(),
        canAddCustomDomain: false,
        maxCustomDomains: 0,
        domains: [],
      };
    }

    const site = await ctx.db.get(args.siteId);
    if (!site || site.ownerUserId !== user._id) {
      return {
        canUseCustomDomain: false,
        customDomainsConfigured: isCustomDomainsConfigured(),
        canAddCustomDomain: false,
        maxCustomDomains: 0,
        domains: [],
      };
    }

    const plan = normalizeOwnerPlan(user.ownerPlan);
    const customDomainsConfigured = isCustomDomainsConfigured();
    const planAllowsCustomDomains = canUseCustomDomain(plan);
    const domains = await ctx.db
      .query("siteCustomDomains")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    domains.sort((a, b) => b.createdAt - a.createdAt);

    return {
      canUseCustomDomain: planAllowsCustomDomains,
      customDomainsConfigured,
      canAddCustomDomain: planAllowsCustomDomains && customDomainsConfigured,
      maxCustomDomains: maxCustomDomainsForPlan(plan),
      domains: domains.map((domain) => ({
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
      })),
    };
  },
});

export const getSiteByCustomHostname = query({
  args: { hostname: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      siteId: v.id("sites"),
      slug: v.string(),
      hostKind: v.union(v.literal("bot_subdomain"), v.literal("custom_slug")),
    }),
  ),
  handler: async (ctx, args) => {
    const hostnameLower = normalizeCustomDomainHostname(args.hostname);
    if (!hostnameLower) return null;

    const domain = await ctx.db
      .query("siteCustomDomains")
      .withIndex("by_hostname_lower", (q) => q.eq("hostnameLower", hostnameLower))
      .unique();
    if (!domain || domain.status !== "active") return null;

    const site = await ctx.db.get(domain.siteId);
    if (!site) return null;

    return {
      siteId: site._id,
      slug: site.slug,
      hostKind: site.hostKind,
    };
  },
});
