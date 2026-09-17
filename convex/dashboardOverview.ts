"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { ensureMeridianAccessToken } from "./meridian/ensureAccessToken";
import { resolveMeridianBot } from "./meridian/botIds";
import { resolveMeridianBotLiveStats } from "./meridian/botStats";
import {
  countFlowsForBot,
  readFlowCountsFromHomeStats,
} from "./meridian/flowStats";
import {
  fetchMeridianUserinfo,
  MeridianUserinfoError,
} from "./meridian/userinfo";

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export const loadBotOverview = action({
  args: { siteId: v.optional(v.id("sites")) },
  returns: v.object({
    meridianConnected: v.boolean(),
    missingScopes: v.boolean(),
    siteOptions: v.array(
      v.object({
        _id: v.id("sites"),
        title: v.string(),
        meridianBotId: v.optional(v.string()),
        status: v.string(),
      }),
    ),
    focusSite: v.union(
      v.null(),
      v.object({
        _id: v.id("sites"),
        title: v.string(),
        slug: v.string(),
        status: v.string(),
        hostKind: v.union(v.literal("bot_subdomain"), v.literal("custom_slug")),
        meridianBotId: v.optional(v.string()),
        botName: v.optional(v.string()),
        linkedGuildId: v.optional(v.string()),
      }),
    ),
    bot: v.union(
      v.null(),
      v.object({
        meridianBotId: v.string(),
        name: v.string(),
        avatarUrl: v.optional(v.string()),
        online: v.optional(v.boolean()),
        presence: v.optional(v.string()),
        hostingEnabled: v.optional(v.boolean()),
      }),
    ),
    stats: v.union(
      v.null(),
      v.object({
        servers: v.union(v.number(), v.null()),
        members: v.union(v.number(), v.null()),
        uptimeMs: v.union(v.number(), v.null()),
        commands: v.number(),
        events: v.number(),
        functions: v.number(),
        dockCasesActive: v.number(),
        dockCasesTotal: v.number(),
      }),
    ),
    error: v.optional(v.string()),
    statsHints: v.optional(
      v.object({
        needsGuildScope: v.boolean(),
        needsPublicStatus: v.boolean(),
        membersUnavailable: v.boolean(),
        needsFlowsScope: v.boolean(),
      }),
    ),
  }),
  handler: async (ctx, args): Promise<{
    meridianConnected: boolean;
    missingScopes: boolean;
    siteOptions: Array<{
      _id: import("./_generated/dataModel").Id<"sites">;
      title: string;
      meridianBotId?: string;
      status: string;
    }>;
    focusSite: null | {
      _id: import("./_generated/dataModel").Id<"sites">;
      title: string;
      slug: string;
      status: string;
      hostKind: "bot_subdomain" | "custom_slug";
      meridianBotId?: string;
      botName?: string;
      linkedGuildId?: string;
    };
    bot: null | {
      meridianBotId: string;
      name: string;
      avatarUrl?: string;
      online?: boolean;
      presence?: string;
      hostingEnabled?: boolean;
    };
    stats: null | {
      servers: number | null;
      members: number | null;
      uptimeMs: number | null;
      commands: number;
      events: number;
      functions: number;
      dockCasesActive: number;
      dockCasesTotal: number;
    };
    error?: string;
    statsHints?: {
      needsGuildScope: boolean;
      needsPublicStatus: boolean;
      membersUnavailable: boolean;
      needsFlowsScope: boolean;
    };
  }> => {
    const context = await ctx.runQuery(
      internal.dashboardOverviewQueries.getFocusSiteContext,
      { siteId: args.siteId },
    );

    const authContext = await ctx.runQuery(
      internal.meridian.tokens.getMeridianAuthContext,
      {},
    );

    if (!context.focusSite) {
      return {
        meridianConnected: authContext.meridianConnected,
        missingScopes: false,
        siteOptions: context.siteOptions,
        focusSite: null,
        bot: null,
        stats: null,
        ...(context.siteOptions.length === 0
          ? { error: "Create a site to see bot overview." }
          : {}),
      };
    }

    const meridianBotId = context.focusSite.meridianBotId?.trim();
    if (!meridianBotId) {
      return {
        meridianConnected: authContext.meridianConnected,
        missingScopes: false,
        siteOptions: context.siteOptions,
        focusSite: context.focusSite,
        bot: null,
        stats: {
          servers: null,
          members: null,
          uptimeMs: null,
          commands: 0,
          events: 0,
          functions: 0,
          dockCasesActive: context.caseStats?.active ?? 0,
          dockCasesTotal: context.caseStats?.total ?? 0,
        },
        error: "This site is not linked to a Meridian bot.",
      };
    }

    if (!authContext.meridianConnected || !authContext.accessToken) {
      return {
        meridianConnected: authContext.meridianConnected,
        missingScopes: false,
        siteOptions: context.siteOptions,
        focusSite: context.focusSite,
        bot: {
          meridianBotId,
          name: context.focusSite.botName ?? context.focusSite.title,
        },
        stats: {
          servers: null,
          members: null,
          uptimeMs: null,
          commands: 0,
          events: 0,
          functions: 0,
          dockCasesActive: context.caseStats?.active ?? 0,
          dockCasesTotal: context.caseStats?.total ?? 0,
        },
        error: "Sign in with Meridian to load live bot stats.",
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
          missingScopes: false,
          siteOptions: context.siteOptions,
          focusSite: context.focusSite,
          bot: {
            meridianBotId,
            name: context.focusSite.botName ?? context.focusSite.title,
          },
          stats: {
            servers: null,
            members: null,
            uptimeMs: null,
            commands: 0,
            events: 0,
            functions: 0,
            dockCasesActive: context.caseStats?.active ?? 0,
            dockCasesTotal: context.caseStats?.total ?? 0,
          },
          error: "Sign in with Meridian again to load live bot stats.",
        };
      }

      const userinfo = await fetchMeridianUserinfo(accessToken);
      const flows = Array.isArray(userinfo.flows) ? userinfo.flows : [];
      const guilds = Array.isArray(userinfo.guilds) ? userinfo.guilds : [];
      const guildsScopeGranted = userinfo.guilds !== undefined;
      const flowsScopeGranted = userinfo.flows !== undefined;
      const missingScopes = !flowsScopeGranted || !guildsScopeGranted;

      const meridianBot = resolveMeridianBot(meridianBotId, userinfo.bots);
      const liveStats = await resolveMeridianBotLiveStats({
        accessToken,
        meridianBotId,
        bots: userinfo.bots,
        flows,
        guilds,
        guildsScopeGranted,
        flowsScopeGranted,
      });
      const status = liveStats.status;

      const flowCountsFromUserinfo = countFlowsForBot(
        flows,
        meridianBotId,
        userinfo.bots,
      );
      const flowCountsFromHome = readFlowCountsFromHomeStats(liveStats.homeStats);
      const userinfoFlowTotal =
        flowCountsFromUserinfo.commands +
        flowCountsFromUserinfo.events +
        flowCountsFromUserinfo.functions;
      const flowCounts =
        userinfoFlowTotal > 0
          ? flowCountsFromUserinfo
          : flowCountsFromHome ?? flowCountsFromUserinfo;

      return {
        meridianConnected: true,
        missingScopes,
        siteOptions: context.siteOptions,
        focusSite: context.focusSite,
        bot: {
          meridianBotId,
          name:
            meridianBot?.name ??
            status?.name ??
            context.focusSite.botName ??
            context.focusSite.title,
          avatarUrl:
            optionalString(meridianBot?.avatarUrl) ??
            optionalString(meridianBot?.avatar),
          online: status?.online,
          presence:
            optionalString(status?.presence) ??
            optionalString(meridianBot?.status),
          hostingEnabled: status?.hostingEnabled,
        },
        stats: {
          servers: liveStats.servers,
          members: liveStats.members,
          uptimeMs: liveStats.uptimeMs,
          commands: flowCounts.commands,
          events: flowCounts.events,
          functions: flowCounts.functions,
          dockCasesActive: context.caseStats?.active ?? 0,
          dockCasesTotal: context.caseStats?.total ?? 0,
        },
        statsHints: liveStats.hints,
      };
    } catch (error) {
      let message = "Could not load bot stats from Meridian.";
      if (error instanceof MeridianUserinfoError && error.status === 401) {
        message = "Meridian session expired. Sign out and sign in with Meridian again.";
      } else if (
        error instanceof Error &&
        error.message.includes("token refresh failed")
      ) {
        message = "Meridian session expired. Sign out and sign in with Meridian again.";
      }

      return {
        meridianConnected: true,
        missingScopes: false,
        siteOptions: context.siteOptions,
        focusSite: context.focusSite,
        bot: {
          meridianBotId,
          name: context.focusSite.botName ?? context.focusSite.title,
        },
        stats: {
          servers: null,
          members: null,
          uptimeMs: null,
          commands: 0,
          events: 0,
          functions: 0,
          dockCasesActive: context.caseStats?.active ?? 0,
          dockCasesTotal: context.caseStats?.total ?? 0,
        },
        error: message,
      };
    }
  },
});
