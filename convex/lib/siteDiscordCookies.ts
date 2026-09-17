export const SITE_DISCORD_USER_COOKIE = "dock_site_discord_user";
export const SITE_DISCORD_TOKEN_COOKIE = "dock_site_discord_token";

export function siteDiscordSetCookieHeaders(input: {
  discordUserId: string;
  accessToken: string;
  maxAgeSeconds?: number;
  secure?: boolean;
}): string[] {
  const maxAge = input.maxAgeSeconds ?? 60 * 60 * 24 * 7;
  const secure = input.secure ? "; Secure" : "";
  return [
    `${SITE_DISCORD_USER_COOKIE}=${encodeURIComponent(input.discordUserId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
    `${SITE_DISCORD_TOKEN_COOKIE}=${encodeURIComponent(input.accessToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  ];
}
