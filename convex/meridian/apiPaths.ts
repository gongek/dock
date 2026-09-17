export const MERIDIAN_ORIGIN = "https://meridian.surf";

export const MERIDIAN_USERINFO_URL = `${MERIDIAN_ORIGIN}/api/oauth/userinfo`;
export const MERIDIAN_USER_BILLING_URL = `${MERIDIAN_ORIGIN}/api/external/v1/user/billing`;
export const MERIDIAN_BILLING_SUMMARY_URL = `${MERIDIAN_ORIGIN}/api/external/v1/billing/summary`;

export function meridianBotHomeStatsUrl(botId: string): string {
  return `${MERIDIAN_ORIGIN}/api/external/v1/bots/${encodeURIComponent(botId)}/home-stats`;
}

/** Legacy fallbacks until Meridian deprecates alternate routes. */
export function meridianBotHomeStatsFallbackUrls(botId: string): string[] {
  const encoded = encodeURIComponent(botId);
  return [
    meridianBotHomeStatsUrl(botId),
    `${MERIDIAN_ORIGIN}/api/external/v1/bots/${encoded}/dashboard`,
    `${MERIDIAN_ORIGIN}/api/external/v1/bots/${encoded}/stats`,
    `https://api.meridian.surf/v1/bots/${encoded}/home-stats`,
  ];
}

export function meridianBotPublicStatusSettingsUrl(botId: string): string {
  return `${MERIDIAN_ORIGIN}/api/external/v1/bots/${encodeURIComponent(botId)}/public-status`;
}

export function meridianBotVariablesUrl(botId: string, guildId?: string): string {
  const base = `${MERIDIAN_ORIGIN}/api/external/v1/bots/${encodeURIComponent(botId)}/variables`;
  if (!guildId?.trim()) {
    return base;
  }
  const params = new URLSearchParams({ guildId: guildId.trim() });
  return `${base}?${params.toString()}`;
}

export function meridianBotCasesUrl(botId: string): string {
  return `${MERIDIAN_ORIGIN}/api/external/v1/bots/${encodeURIComponent(botId)}/cases`;
}

export function meridianBotFlowsUrl(botId: string): string {
  return `${MERIDIAN_ORIGIN}/api/external/v1/bots/${encodeURIComponent(botId)}/flows`;
}

export function meridianPublicBotStatusUrl(botRef: string): string {
  return `${MERIDIAN_ORIGIN}/botstatus/${encodeURIComponent(botRef)}/api`;
}
