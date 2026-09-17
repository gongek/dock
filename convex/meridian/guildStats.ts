import { collectMeridianBotIds, resolveMeridianBot } from "./botIds";
import type {
  MeridianUserinfoBot,
  MeridianUserinfoFlow,
  MeridianUserinfoGuild,
} from "./userinfo";

export function selectGuildsForSite(
  guilds: MeridianUserinfoGuild[] | undefined,
  meridianBotId: string,
  bots?: MeridianUserinfoBot[],
  flows?: MeridianUserinfoFlow[],
): MeridianUserinfoGuild[] {
  const guildList = guilds ?? [];
  if (guildList.length === 0) {
    return [];
  }

  const botIds = new Set(collectMeridianBotIds(meridianBotId, bots, flows));
  const scoped = guildList.filter(
    (guild) => guild.botId != null && botIds.has(guild.botId),
  );
  if (scoped.length > 0) {
    return scoped;
  }

  const resolved = resolveMeridianBot(meridianBotId, bots);
  if (resolved?.id) {
    const byResolvedId = guildList.filter((guild) => guild.botId === resolved.id);
    if (byResolvedId.length > 0) {
      return byResolvedId;
    }
  }

  const flowBotIds = [
    ...new Set(
      (flows ?? [])
        .map((flow) => flow.botId?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  if (flowBotIds.length === 1) {
    const flowBotId = flowBotIds[0];
    const byFlowBot = guildList.filter((guild) => guild.botId === flowBotId);
    if (byFlowBot.length > 0) {
      return byFlowBot;
    }
  }

  if ((bots?.length ?? 0) === 1) {
    return guildList;
  }

  const distinctGuildBotIds = [
    ...new Set(
      guildList
        .map((guild) => guild.botId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  if (distinctGuildBotIds.length === 1) {
    return guildList;
  }

  return [];
}
