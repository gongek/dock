import { collectMeridianBotIds } from "./botIds";
import type { MeridianUserinfoBot, MeridianUserinfoFlow } from "./userinfo";

const DISCORD_SNOWFLAKE_RE = /^\d{17,20}$/;

function addDiscordSnowflake(ids: Set<string>, value?: string) {
  const trimmed = value?.trim();
  if (trimmed && DISCORD_SNOWFLAKE_RE.test(trimmed)) {
    ids.add(trimmed);
  }
}

export function collectBotStatusRefs(
  meridianBotId: string,
  bots?: MeridianUserinfoBot[],
  flows?: MeridianUserinfoFlow[],
): string[] {
  const refs = new Set<string>();

  for (const id of collectMeridianBotIds(meridianBotId, bots, flows)) {
    refs.add(id);
    addDiscordSnowflake(refs, id);
  }

  for (const bot of bots ?? []) {
    addDiscordSnowflake(refs, bot.id);
    addDiscordSnowflake(refs, bot.discordId);
    addDiscordSnowflake(refs, bot.applicationId);
  }

  for (const flow of flows ?? []) {
    addDiscordSnowflake(refs, flow.botId);
  }

  addDiscordSnowflake(refs, meridianBotId);

  return [...refs];
}
