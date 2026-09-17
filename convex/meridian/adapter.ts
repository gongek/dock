"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { ensureMeridianAccessToken } from "./ensureAccessToken";
import { normalizeSiteSlug } from "../lib/siteValidators";
import type { MeridianBotSummary } from "./types";
import { resolveMeridianUserPlan } from "./planResolve";
import type { MeridianUserinfoBot } from "./userinfo";
import { attachLinkedGuildToBotSummaries } from "./guildMetadata";

function botLabelFromMeridianBot(bot: MeridianUserinfoBot): string | null {
  if (typeof bot.label === "string") {
    const fromLabel = normalizeSiteSlug(bot.label);
    if (fromLabel) return fromLabel;
  }

  if (typeof bot.name === "string") {
    const base = bot.name.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const fromName = normalizeSiteSlug(base);
    if (fromName) return fromName;
  }

  if (typeof bot.id === "string") {
    const fromId = normalizeSiteSlug(bot.id);
    if (fromId) return fromId;
  }

  return null;
}

function mapMeridianBots(bots: MeridianUserinfoBot[]): MeridianBotSummary[] {
  const mapped: MeridianBotSummary[] = [];

  for (const bot of bots) {
    const meridianBotId = typeof bot.id === "string" ? bot.id.trim() : "";
    if (!meridianBotId) continue;

    const label = botLabelFromMeridianBot(bot);
    if (!label) continue;

    mapped.push({
      meridianBotId,
      label,
      name: typeof bot.name === "string" && bot.name.trim()
        ? bot.name.trim()
        : label,
    });
  }

  return mapped;
}

function mapMeridianUserinfoBots(
  payloadBots: MeridianUserinfoBot[] | undefined,
): MeridianBotSummary[] {
  const bots = Array.isArray(payloadBots) ? payloadBots : [];
  return mapMeridianBots(bots);
}

export const listBotsForUser = action({
  args: {},
  returns: v.object({
    meridianConnected: v.boolean(),
    bots: v.array(
      v.object({
        meridianBotId: v.string(),
        label: v.string(),
        name: v.string(),
        linkedGuildId: v.optional(v.string()),
      }),
    ),
    error: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const authContext = await ctx.runQuery(
      internal.meridian.tokens.getMeridianAuthContext,
      {},
    );

    if (!authContext.meridianConnected) {
      return {
        meridianConnected: false,
        bots: [],
        error: "Connect your Meridian account to list bots.",
      };
    }

    if (!authContext.accessToken) {
      return {
        meridianConnected: true,
        bots: [],
        error:
          "Meridian access token is missing. Sign in with Meridian again to refresh access.",
      };
    }

    try {
      const accessToken = await ensureMeridianAccessToken(ctx, {
        userId: authContext.userId,
        accessToken: authContext.accessToken,
        refreshToken: authContext.refreshToken,
        expiresAt: authContext.expiresAt,
      });
      if (!accessToken) {
        return {
          meridianConnected: true,
          bots: [],
          error:
            "Meridian access token is missing. Sign in with Meridian again to refresh access.",
        };
      }

      const { plan: meridianPlan, isMeridianStaff, userinfo } =
        await resolveMeridianUserPlan(accessToken);
      if (authContext.userId) {
        await ctx.runMutation(internal.meridian.planSync.syncOwnerPlanForUser, {
          userId: authContext.userId,
          meridianPlan,
          isMeridianStaff,
        });
      }

      const bots = attachLinkedGuildToBotSummaries(
        mapMeridianUserinfoBots(userinfo.bots),
        userinfo.guilds,
        userinfo.bots,
      );
      return {
        meridianConnected: true,
        bots,
        ...(bots.length === 0
          ? {
              error:
                "No Meridian bots found. Create or link a bot on Meridian, then refresh.",
            }
          : {}),
      };
    } catch {
      return {
        meridianConnected: true,
        bots: [],
        error: "Could not load bots from Meridian.",
      };
    }
  },
});
