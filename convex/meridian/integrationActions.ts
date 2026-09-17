"use node";

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { action, type ActionCtx } from "../_generated/server";
import { fetchMeridianCases } from "./casesClient";
import {
  enableMeridianPublicStatus,
  fetchMeridianPublicStatusSettings,
} from "./botPublicStatus";
import {
  listGuildsForMeridianBot,
  resolvePrimaryGuildIdForBot,
} from "./guildMetadata";
import { ensureMeridianAccessToken } from "./ensureAccessToken";
import { fetchMeridianUserinfo } from "./userinfo";
import { fetchMeridianPublicVariables } from "./variablesClient";

async function accessTokenForUser(
  ctx: ActionCtx,
  userId: Id<"users">,
): Promise<string | null> {
  const authContext = await ctx.runQuery(
    internal.meridian.tokens.getMeridianAuthContextForUser,
    { userId },
  );
  if (!authContext.meridianConnected || !authContext.accessToken) {
    return null;
  }
  return ensureMeridianAccessToken(ctx, {
    userId: authContext.userId,
    accessToken: authContext.accessToken,
    refreshToken: authContext.refreshToken,
    expiresAt: authContext.expiresAt,
  });
}

async function ownerAccessToken(ctx: ActionCtx): Promise<string | null> {
  const authContext = await ctx.runQuery(
    internal.meridian.tokens.getMeridianAuthContext,
    {},
  );
  if (!authContext.meridianConnected || !authContext.accessToken || !authContext.userId) {
    return null;
  }
  return accessTokenForUser(ctx, authContext.userId);
}

const TEMPLATE_VARS_STALE_MS = 5 * 60 * 1000;

async function pullMeridianVariablesIntoSite(
  ctx: ActionCtx,
  input: {
    siteId: Id<"sites">;
    meridianBotId: string;
    guildId?: string;
    accessToken: string;
  },
): Promise<Record<string, string>> {
  const vars = await fetchMeridianPublicVariables({
    accessToken: input.accessToken,
    meridianBotId: input.meridianBotId,
    guildId: input.guildId,
  });

  const entries = Object.entries(vars);
  if (entries.length === 0) {
    return {};
  }

  await ctx.runMutation(internal.meridian.siteSyncInternal.applyMeridianVariableBatch, {
    siteId: input.siteId,
    variables: entries.map(([key, value]) => ({
      key,
      value: String(value),
    })),
  });

  const stored: Record<string, string> = {};
  for (const [key, value] of entries) {
    stored[key] = String(value);
  }
  return stored;
}

export const ensureTemplateVarsForSite = action({
  args: { siteId: v.id("sites") },
  returns: v.record(v.string(), v.string()),
  handler: async (ctx, args): Promise<Record<string, string>> => {
    const cache = await ctx.runQuery(internal.siteVariables.readTemplateVarCache, {
      siteId: args.siteId,
    });
    if (!cache.site) {
      return cache.vars;
    }

    const meridianBotId = cache.site.meridianBotId;
    const stale =
      cache.newestUpdatedAt === 0 ||
      Date.now() - cache.newestUpdatedAt > TEMPLATE_VARS_STALE_MS;

    if (!stale || !meridianBotId) {
      return cache.vars;
    }

    let accessToken: string | null = null;
    try {
      accessToken = await accessTokenForUser(ctx, cache.site.ownerUserId);
    } catch {
      return cache.vars;
    }
    if (!accessToken) {
      return cache.vars;
    }

    const synced = await pullMeridianVariablesIntoSite(ctx, {
      siteId: args.siteId,
      meridianBotId,
      guildId: cache.site.linkedGuildId,
      accessToken,
    });

    return Object.keys(synced).length > 0 ? synced : cache.vars;
  },
});

export const syncMeridianCasesForSite = action({
  args: {
    siteId: v.id("sites"),
    meridianBotId: v.string(),
    scope: v.optional(v.union(v.literal("guild"), v.literal("global"))),
    guildKey: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    upserted: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: boolean; upserted: number; error?: string }> => {
    const accessToken = await ownerAccessToken(ctx);
    if (!accessToken) {
      return { ok: false, upserted: 0, error: "Meridian sign-in required." };
    }

    const cases = await fetchMeridianCases({
      accessToken,
      meridianBotId: args.meridianBotId,
      scope: args.scope,
      guildKey: args.guildKey,
    });

    if (cases.length === 0) {
      return {
        ok: true,
        upserted: 0,
        error:
          "No cases returned. Meridian cases.read API may not be available yet.",
      };
    }

    const batchResult = await ctx.runMutation(
      internal.meridian.siteSyncInternal.applyMeridianCaseBatch,
      {
        siteId: args.siteId,
        meridianBotId: args.meridianBotId,
        cases: cases.map((row) => ({
          caseId: row.caseId,
          caseNumber: row.caseNumber,
          publicSlug: row.publicSlug,
          scope: row.scope,
          guildKey: row.guildKey,
          targetUserId: row.targetUserId,
          type: row.type,
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
        })),
      },
    );

    return { ok: true, upserted: batchResult.upserted };
  },
});

export const syncMeridianVariablesForSite = action({
  args: {
    siteId: v.id("sites"),
    meridianBotId: v.string(),
    guildId: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    upserted: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: boolean; upserted: number; error?: string }> => {
    const accessToken = await ownerAccessToken(ctx);
    if (!accessToken) {
      return { ok: false, upserted: 0, error: "Meridian sign-in required." };
    }

    const synced = await pullMeridianVariablesIntoSite(ctx, {
      siteId: args.siteId,
      meridianBotId: args.meridianBotId,
      guildId: args.guildId,
      accessToken,
    });

    const entries = Object.entries(synced);
    if (entries.length === 0) {
      return {
        ok: true,
        upserted: 0,
        error:
          "No variables returned. Meridian variables.read API may not be available yet.",
      };
    }

    return { ok: true, upserted: entries.length };
  },
});

export const enablePublicBotStatus = action({
  args: { meridianBotId: v.string() },
  returns: v.object({
    ok: v.boolean(),
    enabled: v.optional(v.boolean()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const accessToken = await ownerAccessToken(ctx);
    if (!accessToken) {
      return { ok: false, error: "Meridian sign-in required." };
    }

    const result = await enableMeridianPublicStatus({
      accessToken,
      meridianBotId: args.meridianBotId,
      enabled: true,
    });

    if (!result.ok) {
      const current = await fetchMeridianPublicStatusSettings({
        accessToken,
        meridianBotId: args.meridianBotId,
      });
      return {
        ok: false,
        enabled: current?.enabled,
        error:
          "Could not enable public status. Meridian botstatus.write API may not be available yet.",
      };
    }

    return { ok: true, enabled: result.settings?.enabled ?? true };
  },
});

export const listGuildOptionsFromMeridian = action({
  args: { meridianBotId: v.string() },
  returns: v.object({
    ok: v.boolean(),
    guilds: v.array(
      v.object({
        guildId: v.string(),
        label: v.string(),
        primary: v.boolean(),
      }),
    ),
    linkedGuildId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const accessToken = await ownerAccessToken(ctx);
    if (!accessToken) {
      return { ok: false, guilds: [], error: "Meridian sign-in required." };
    }

    const userinfo = await fetchMeridianUserinfo(accessToken);
    const guilds = listGuildsForMeridianBot(
      args.meridianBotId,
      userinfo.guilds,
      userinfo.bots,
    );
    return {
      ok: true,
      guilds,
      linkedGuildId: resolvePrimaryGuildIdForBot(
        args.meridianBotId,
        userinfo.guilds,
        userinfo.bots,
      ),
    };
  },
});
