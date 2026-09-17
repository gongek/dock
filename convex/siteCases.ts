import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { DEFAULT_CASE_URL_PATTERN } from "./lib/siteValidators";
import type { Id } from "./_generated/dataModel";
import { customAlphabet } from "nanoid";

const generatePublicSlug = customAlphabet(
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789",
  7,
);

async function assertSiteOwner(
  ctx: { db: any },
  siteId: Id<"sites">,
  userId: Id<"users">,
) {
  const site = await ctx.db.get(siteId);
  if (!site || site.ownerUserId !== userId) {
    throw new Error("Site not found.");
  }
  return site;
}

export const listCaseRecords = query({
  args: {
    siteId: v.id("sites"),
    meridianBotId: v.optional(v.string()),
    scope: v.optional(v.union(v.literal("guild"), v.literal("global"))),
    guildKey: v.optional(v.string()),
    typeFilter: v.optional(v.string()),
    statusFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("siteCaseRecords")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    const now = Date.now();
    return records
      .filter((row) => {
        if (args.meridianBotId && row.meridianBotId !== args.meridianBotId) {
          return false;
        }
        if (args.scope && row.scope !== args.scope) return false;
        if (args.guildKey !== undefined && row.guildKey !== args.guildKey) {
          return false;
        }
        if (args.typeFilter && args.typeFilter !== "any" && row.type !== args.typeFilter) {
          return false;
        }
        if (args.statusFilter && args.statusFilter !== "any") {
          const revoked = row.revokedAt != null;
          const expired = row.expiresAt != null && row.expiresAt <= now;
          if (args.statusFilter === "revoked" && !revoked) return false;
          if (args.statusFilter === "expired" && (revoked || !expired)) return false;
          if (args.statusFilter === "active" && (revoked || expired)) return false;
        }
        return true;
      })
      .sort((a, b) => b.caseNumber - a.caseNumber);
  },
});

export const getCaseByPublicSlug = query({
  args: { siteId: v.id("sites"), publicSlug: v.string() },
  handler: async (ctx, args) => {
    return (
      (await ctx.db
        .query("siteCaseRecords")
        .withIndex("by_site_and_public_slug", (q) =>
          q.eq("siteId", args.siteId).eq("publicSlug", args.publicSlug),
        )
        .unique()) ?? null
    );
  },
});

export const getCaseByNumber = query({
  args: { siteId: v.id("sites"), caseNumber: v.number() },
  handler: async (ctx, args) => {
    return (
      (await ctx.db
        .query("siteCaseRecords")
        .withIndex("by_site_and_case_number", (q) =>
          q.eq("siteId", args.siteId).eq("caseNumber", args.caseNumber),
        )
        .unique()) ?? null
    );
  },
});

export const upsertCaseCollection = mutation({
  args: {
    siteId: v.id("sites"),
    blockId: v.string(),
    meridianBotId: v.string(),
    scope: v.union(v.literal("guild"), v.literal("global")),
    guildKey: v.string(),
    typeFilter: v.string(),
    statusFilter: v.string(),
    detailPageId: v.optional(v.id("sitePages")),
    caseUrlPattern: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    const existing = await ctx.db
      .query("siteCaseCollections")
      .withIndex("by_site_and_block", (q) =>
        q.eq("siteId", args.siteId).eq("blockId", args.blockId),
      )
      .unique();
    const now = Date.now();
    const payload = {
      meridianBotId: args.meridianBotId,
      scope: args.scope,
      guildKey: args.guildKey,
      typeFilter: args.typeFilter,
      statusFilter: args.statusFilter,
      detailPageId: args.detailPageId,
      caseUrlPattern: site.caseUrlPattern || DEFAULT_CASE_URL_PATTERN,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("siteCaseCollections", {
      siteId: args.siteId,
      blockId: args.blockId,
      ...payload,
      createdAt: now,
    });
  },
});

export const seedMockCases = mutation({
  args: {
    siteId: v.id("sites"),
    meridianBotId: v.string(),
    guildKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    const guildKey = args.guildKey?.trim() || site.linkedGuildId || "0";
    const existing = await ctx.db
      .query("siteCaseRecords")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();
    if (existing.length > 0) return existing.length;

    const now = Date.now();
    const samples = [
      { type: "warn" as const, reason: "Spam in general chat" },
      { type: "note" as const, reason: "Account flagged for review" },
      { type: "timeout" as const, reason: "Repeated rule violations" },
    ];

    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index]!;
      await ctx.db.insert("siteCaseRecords", {
        siteId: site._id,
        meridianBotId: args.meridianBotId,
        scope: "guild",
        guildKey,
        publicSlug: generatePublicSlug(),
        caseNumber: index + 1,
        targetUserId: `${1000 + index}`,
        type: sample.type,
        reason: sample.reason,
        issuerUserId: user.discordId ?? undefined,
        createdAt: now - index * 1000,
        updatedAt: now - index * 1000,
      });
    }
    return samples.length;
  },
});

export const listGuildOptionsForSite = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    const options = new Map<string, { label: string; description?: string }>();

    function add(id: string | undefined, label: string, description?: string) {
      const value = id?.trim();
      if (!value) return;
      const existing = options.get(value);
      if (!existing || existing.label === value) {
        options.set(value, { label, description });
      }
    }

    add(site.linkedGuildId, "Linked guild", site.linkedGuildId);

    if (site.meridianBotId) {
      const bot = await ctx.db
        .query("meridianMockBots")
        .withIndex("by_meridian_bot_id", (q) =>
          q.eq("meridianBotId", site.meridianBotId!),
        )
        .unique();
      add(bot?.linkedGuildId, bot?.name?.trim() || "Bot guild", bot?.linkedGuildId);
    }

    const records = await ctx.db
      .query("siteCaseRecords")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();
    for (const row of records) {
      add(row.guildKey, row.guildKey);
    }

    const collections = await ctx.db
      .query("siteCaseCollections")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();
    for (const row of collections) {
      add(row.guildKey, row.guildKey);
    }

    return [...options.entries()].map(([value, meta]) => ({
      value,
      label: meta.label,
      description: meta.description && meta.description !== meta.label ? meta.description : undefined,
    }));
  },
});

export const listCaseCollections = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("siteCaseCollections")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
  },
});
