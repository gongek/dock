import {
  fetchMeridianBotStatus,
  readMemberCountFromStatus,
  type MeridianBotStatusPayload,
} from "./botStatus";
import { collectMeridianBotIds, resolveMeridianBot } from "./botIds";
import {
  collectBotStatusRefs,
} from "./botStatusRefs";
import { meridianBotHomeStatsFallbackUrls } from "./apiPaths";
import { selectGuildsForSite } from "./guildStats";
import type {
  MeridianUserinfoBot,
  MeridianUserinfoFlow,
  MeridianUserinfoGuild,
} from "./userinfo";

export type MeridianBotLiveStats = {
  servers: number | null;
  members: number | null;
  uptimeMs: number | null;
  status: MeridianBotStatusPayload | null;
  homeStats: Record<string, unknown> | null;
  hints: {
    needsGuildScope: boolean;
    needsPublicStatus: boolean;
    membersUnavailable: boolean;
    needsFlowsScope: boolean;
  };
};

type MeridianBotHomeStatsPayload = Record<string, unknown>;

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function flattenHomeStatsPayload(
  payload: MeridianBotHomeStatsPayload,
): MeridianBotHomeStatsPayload {
  const stats = payload.stats;
  if (stats && typeof stats === "object" && !Array.isArray(stats)) {
    return { ...payload, ...(stats as Record<string, unknown>) };
  }
  return payload;
}

function readBotRecordStats(bot: MeridianUserinfoBot | null): {
  servers: number | null;
  members: number | null;
  uptimeMs: number | null;
} {
  if (!bot) {
    return { servers: null, members: null, uptimeMs: null };
  }

  const record = bot as MeridianUserinfoBot & Record<string, unknown>;

  return {
    servers:
      readNumber(record.guildCount) ??
      readNumber(record.servers) ??
      readNumber(record.serverCount),
    members:
      readNumber(record.memberCount) ??
      readNumber(record.members) ??
      readNumber(record.totalMemberCount),
    uptimeMs: readNumber(record.uptimeMs),
  };
}

function mergeStatus(
  current: MeridianBotStatusPayload | null,
  next: MeridianBotStatusPayload,
): MeridianBotStatusPayload {
  if (!current) {
    return next;
  }
  return {
    ...current,
    ...next,
    online: next.online ?? current.online,
    discordId: next.discordId ?? current.discordId,
    name: next.name ?? current.name,
    hostingEnabled: next.hostingEnabled ?? current.hostingEnabled,
    presence: next.presence ?? current.presence,
    uptimeMs: next.uptimeMs ?? current.uptimeMs,
    guildCount: next.guildCount ?? current.guildCount,
    shardCount: next.shardCount ?? current.shardCount,
    memberCount: next.memberCount ?? current.memberCount,
    totalMemberCount: next.totalMemberCount ?? current.totalMemberCount,
  };
}

export async function resolvePublicBotStatus(
  botRefs: string[],
): Promise<MeridianBotStatusPayload | null> {
  const tried = new Set<string>();
  let status: MeridianBotStatusPayload | null = null;

  for (const ref of botRefs) {
    const key = ref.trim();
    if (!key || tried.has(key)) {
      continue;
    }
    tried.add(key);

    const next = await fetchMeridianBotStatus(key);
    if (!next) {
      continue;
    }
    status = mergeStatus(status, next);

    if (next.discordId) {
      const discordId = next.discordId.trim();
      if (discordId && !tried.has(discordId)) {
        tried.add(discordId);
        const byDiscord = await fetchMeridianBotStatus(discordId);
        if (byDiscord) {
          status = mergeStatus(status, byDiscord);
        }
      }
    }
  }

  return status;
}

async function fetchMeridianBotHomeStats(
  accessToken: string,
  botId: string,
): Promise<MeridianBotHomeStatsPayload | null> {
  for (const url of meridianBotHomeStatsFallbackUrls(botId)) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      continue;
    }

    try {
      return flattenHomeStatsPayload(
        (await response.json()) as MeridianBotHomeStatsPayload,
      );
    } catch {
      continue;
    }
  }

  return null;
}

export async function resolveMeridianBotLiveStats(input: {
  accessToken: string;
  meridianBotId: string;
  bots?: MeridianUserinfoBot[];
  flows?: MeridianUserinfoFlow[];
  guilds?: MeridianUserinfoGuild[];
  guildsScopeGranted: boolean;
  flowsScopeGranted: boolean;
}): Promise<MeridianBotLiveStats> {
  const botIds = collectMeridianBotIds(
    input.meridianBotId,
    input.bots,
    input.flows,
  );
  const statusRefs = collectBotStatusRefs(
    input.meridianBotId,
    input.bots,
    input.flows,
  );
  const resolvedBot = resolveMeridianBot(input.meridianBotId, input.bots);
  const botRecordStats = readBotRecordStats(resolvedBot);

  let homeStats: MeridianBotHomeStatsPayload | null = null;
  for (const botId of botIds) {
    homeStats = await fetchMeridianBotHomeStats(input.accessToken, botId);
    if (homeStats) {
      break;
    }
  }

  const status = await resolvePublicBotStatus(statusRefs);

  const guildCountFromUserinfo = input.guildsScopeGranted
    ? selectGuildsForSite(
        input.guilds,
        input.meridianBotId,
        input.bots,
        input.flows,
      ).length
    : 0;

  const servers =
    readNumber(homeStats?.guildCount) ??
    readNumber(homeStats?.servers) ??
    botRecordStats.servers ??
    readNumber(status?.guildCount) ??
    (guildCountFromUserinfo > 0 ? guildCountFromUserinfo : null);

  const members =
    readNumber(homeStats?.members) ??
    readNumber(homeStats?.memberCount) ??
    readNumber(homeStats?.totalMemberCount) ??
    botRecordStats.members ??
    readMemberCountFromStatus(status);

  const uptimeMs =
    readNumber(homeStats?.uptimeMs) ??
    botRecordStats.uptimeMs ??
    readNumber(status?.uptimeMs);

  const needsGuildScope =
    !input.guildsScopeGranted &&
    servers == null &&
    guildCountFromUserinfo === 0;
  const needsPublicStatus =
    servers == null && uptimeMs == null && status == null && !botRecordStats.servers;
  const membersUnavailable = members == null;
  const needsFlowsScope =
    !input.flowsScopeGranted && (input.flows?.length ?? 0) === 0;

  return {
    servers,
    members,
    uptimeMs,
    status,
    homeStats,
    hints: {
      needsGuildScope,
      needsPublicStatus,
      membersUnavailable,
      needsFlowsScope,
    },
  };
}
