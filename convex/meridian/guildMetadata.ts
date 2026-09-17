import { collectMeridianBotIds } from "./botIds";
import type { MeridianUserinfoBot, MeridianUserinfoGuild } from "./userinfo";

export type MeridianGuildOption = {
  guildId: string;
  label: string;
  primary: boolean;
};

export function listGuildsForMeridianBot(
  meridianBotId: string,
  guilds: MeridianUserinfoGuild[] | undefined,
  bots?: MeridianUserinfoBot[],
): MeridianGuildOption[] {
  const guildList = guilds ?? [];
  if (guildList.length === 0) {
    return [];
  }

  const botIds = new Set(collectMeridianBotIds(meridianBotId, bots));
  const scoped = guildList.filter(
    (guild) => guild.botId != null && botIds.has(guild.botId),
  );
  const rows = scoped.length > 0 ? scoped : guildList;

  const options: MeridianGuildOption[] = [];
  for (const row of rows) {
    const guildId = row.guildId?.trim();
    if (!guildId) continue;
    const name = row.name?.trim();
    options.push({
      guildId,
      label: name && name !== guildId ? name : guildId,
      primary: row.primary === true,
    });
  }

  return options;
}

export function resolvePrimaryGuildIdForBot(
  meridianBotId: string,
  guilds: MeridianUserinfoGuild[] | undefined,
  bots?: MeridianUserinfoBot[],
): string | undefined {
  const options = listGuildsForMeridianBot(meridianBotId, guilds, bots);
  const primary = options.find((option) => option.primary);
  if (primary) {
    return primary.guildId;
  }
  if (options.length === 1) {
    return options[0]?.guildId;
  }
  return options[0]?.guildId;
}

export function attachLinkedGuildToBotSummaries<
  T extends { meridianBotId: string; linkedGuildId?: string },
>(
  bots: T[],
  guilds: MeridianUserinfoGuild[] | undefined,
  meridianBots?: MeridianUserinfoBot[],
): T[] {
  return bots.map((bot) => {
    if (bot.linkedGuildId?.trim()) {
      return bot;
    }
    const linkedGuildId = resolvePrimaryGuildIdForBot(
      bot.meridianBotId,
      guilds,
      meridianBots,
    );
    return linkedGuildId ? { ...bot, linkedGuildId } : bot;
  });
}
