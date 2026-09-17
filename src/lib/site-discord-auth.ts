export const SITE_DISCORD_USER_COOKIE = "dock_site_discord_user";
export const SITE_DISCORD_TOKEN_COOKIE = "dock_site_discord_token";

export function readSiteDiscordCookies(cookieHeader: string | null): {
  discordUserId?: string;
  accessToken?: string;
} {
  if (!cookieHeader) return {};
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const map = new Map<string, string>();
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    map.set(part.slice(0, index), decodeURIComponent(part.slice(index + 1)));
  }
  return {
    discordUserId: map.get(SITE_DISCORD_USER_COOKIE),
    accessToken: map.get(SITE_DISCORD_TOKEN_COOKIE),
  };
}

export function siteDiscordCookieHeader(input: {
  discordUserId: string;
  accessToken: string;
  maxAgeSeconds?: number;
}): string {
  const maxAge = input.maxAgeSeconds ?? 60 * 60 * 24 * 7;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return [
    `${SITE_DISCORD_USER_COOKIE}=${encodeURIComponent(input.discordUserId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
    `${SITE_DISCORD_TOKEN_COOKIE}=${encodeURIComponent(input.accessToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  ].join(", ");
}
