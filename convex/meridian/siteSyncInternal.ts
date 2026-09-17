import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { ModerationCaseType } from "./types";

const moderationCaseType = v.union(
  v.literal("warn"),
  v.literal("note"),
  v.literal("kick"),
  v.literal("ban"),
  v.literal("timeout"),
  v.literal("mute"),
  v.literal("unban"),
  v.literal("remove-timeout"),
  v.literal("custom"),
);

const caseRowValidator = v.object({
  caseId: v.string(),
  caseNumber: v.number(),
  publicSlug: v.string(),
  scope: v.union(v.literal("guild"), v.literal("global")),
  guildKey: v.string(),
  targetUserId: v.string(),
  type: moderationCaseType,
  customType: v.optional(v.string()),
  reason: v.optional(v.string()),
  issuerUserId: v.optional(v.string()),
  channelId: v.optional(v.string()),
  evidenceUrl: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
  customMetadataJson: v.optional(v.string()),
  revokedAt: v.optional(v.number()),
  revokedByUserId: v.optional(v.string()),
  revocationReason: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const applyMeridianCaseBatch = internalMutation({
  args: {
    siteId: v.id("sites"),
    meridianBotId: v.string(),
    cases: v.array(caseRowValidator),
  },
  returns: v.object({ upserted: v.number() }),
  handler: async (ctx, args) => {
    let upserted = 0;
    for (const row of args.cases) {
      const meridianCaseId = row.caseId.trim();
      const existing = await ctx.db
        .query("siteCaseRecords")
        .withIndex("by_site_and_meridian_case", (q) =>
          q.eq("siteId", args.siteId).eq("meridianCaseId", meridianCaseId),
        )
        .unique();

      const payload: Omit<Doc<"siteCaseRecords">, "_id" | "_creationTime"> = {
        siteId: args.siteId,
        meridianBotId: args.meridianBotId,
        meridianCaseId,
        scope: row.scope,
        guildKey: row.guildKey,
        publicSlug: row.publicSlug,
        caseNumber: row.caseNumber,
        targetUserId: row.targetUserId,
        type: row.type as ModerationCaseType,
        customType: row.customType,
        reason: row.reason,
        issuerUserId: row.issuerUserId,
        channelId: row.channelId,
        evidenceUrl: row.evidenceUrl,
        durationMinutes: row.durationMinutes,
        expiresAt: row.expiresAt,
        customMetadataJson: row.customMetadataJson,
        revokedAt: row.revokedAt,
        revokedByUserId: row.revokedByUserId,
        revocationReason: row.revocationReason,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("siteCaseRecords", payload);
      }
      upserted += 1;
    }
    return { upserted };
  },
});

export const applyMeridianVariableBatch = internalMutation({
  args: {
    siteId: v.id("sites"),
    variables: v.array(
      v.object({
        key: v.string(),
        value: v.string(),
      }),
    ),
  },
  returns: v.object({ upserted: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    let upserted = 0;
    for (const variable of args.variables) {
      const key = variable.key.trim();
      if (!key) continue;
      const existing = await ctx.db
        .query("siteVariables")
        .withIndex("by_site_and_key", (q) =>
          q.eq("siteId", args.siteId).eq("key", key),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          defaultValue: variable.value,
          source: "meridian_storage",
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("siteVariables", {
          siteId: args.siteId,
          key,
          defaultValue: variable.value,
          source: "meridian_storage",
          createdAt: now,
          updatedAt: now,
        });
      }
      upserted += 1;
    }
    return { upserted };
  },
});
