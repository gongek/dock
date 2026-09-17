import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const insertCustomDomainInternal = internalMutation({
  args: {
    siteId: v.id("sites"),
    hostname: v.string(),
    hostnameLower: v.string(),
    cloudflareHostnameId: v.optional(v.string()),
    verificationJson: v.optional(v.string()),
    sslStatus: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("failed"),
    ),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("siteCustomDomains", {
      siteId: args.siteId,
      hostname: args.hostname,
      hostnameLower: args.hostnameLower,
      status: args.status,
      cloudflareHostnameId: args.cloudflareHostnameId,
      sslStatus: args.sslStatus,
      verificationJson: args.verificationJson,
      lastError: args.lastError,
      createdAt: now,
      updatedAt: now,
      verifiedAt: args.status === "active" ? now : undefined,
    });
  },
});

export const updateCustomDomainInternal = internalMutation({
  args: {
    domainId: v.id("siteCustomDomains"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("failed"),
    ),
    cloudflareHostnameId: v.optional(v.string()),
    sslStatus: v.optional(v.string()),
    verificationJson: v.optional(v.string()),
    lastError: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.domainId);
    if (!existing) return null;

    await ctx.db.patch(args.domainId, {
      status: args.status,
      cloudflareHostnameId: args.cloudflareHostnameId ?? existing.cloudflareHostnameId,
      sslStatus: args.sslStatus ?? existing.sslStatus,
      verificationJson: args.verificationJson ?? existing.verificationJson,
      lastError: args.lastError,
      verifiedAt: args.verifiedAt ?? existing.verifiedAt,
      updatedAt: Date.now(),
    });
    return args.domainId;
  },
});

export const deleteCustomDomainInternal = internalMutation({
  args: { domainId: v.id("siteCustomDomains") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.domainId);
    if (!existing) return null;
    await ctx.db.delete(args.domainId);
    return existing.cloudflareHostnameId ?? null;
  },
});
