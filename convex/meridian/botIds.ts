import { normalizeSiteSlug } from "../lib/siteValidators";
import type { MeridianUserinfoBot, MeridianUserinfoFlow } from "./userinfo";

function slugFromBot(bot: MeridianUserinfoBot): string | null {
  if (typeof bot.label === "string") {
    const fromLabel = normalizeSiteSlug(bot.label);
    if (fromLabel) return fromLabel;
  }
  if (typeof bot.name === "string") {
    const base = bot.name.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const fromName = normalizeSiteSlug(base);
    if (fromName) return fromName;
  }
  return null;
}

export function resolveMeridianBot(
  meridianBotId: string,
  bots?: MeridianUserinfoBot[],
): MeridianUserinfoBot | null {
  const key = meridianBotId.trim();
  if (!key) {
    return null;
  }

  for (const bot of bots ?? []) {
    if (bot.id === key) {
      return bot;
    }
  }

  const keySlug = normalizeSiteSlug(key);
  for (const bot of bots ?? []) {
    const slug = slugFromBot(bot);
    if (slug && keySlug && slug === keySlug) {
      return bot;
    }
    if (bot.id === key) {
      return bot;
    }
  }

  return null;
}

export function collectMeridianBotIds(
  meridianBotId: string,
  bots?: MeridianUserinfoBot[],
  flows?: MeridianUserinfoFlow[],
): string[] {
  const ids = new Set<string>();
  const add = (value?: string) => {
    const trimmed = value?.trim();
    if (trimmed) {
      ids.add(trimmed);
    }
  };

  add(meridianBotId);

  const resolved = resolveMeridianBot(meridianBotId, bots);
  add(resolved?.id);
  add(resolved?.discordId);
  add(resolved?.applicationId);

  const flowList = flows ?? [];
  for (const flow of flowList) {
    if (flow.botId && ids.has(flow.botId)) {
      add(flow.botId);
    }
  }

  if (resolved?.id) {
    for (const flow of flowList) {
      if (flow.botId === resolved.id) {
        add(flow.botId);
      }
    }
  }

  const distinctFlowBotIds = [
    ...new Set(
      flowList
        .map((flow) => flow.botId?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  if (distinctFlowBotIds.length === 1) {
    add(distinctFlowBotIds[0]);
  }

  if ((bots?.length ?? 0) === 1) {
    add(bots?.[0]?.id);
    for (const flow of flowList) {
      add(flow.botId);
    }
  }

  if (ids.size <= 1 && flowList.length > 0) {
    for (const flow of flowList) {
      add(flow.botId);
    }
  }

  return [...ids];
}
