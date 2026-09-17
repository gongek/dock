import { DISCORD_CALLBACK_URL } from "../oauth";
import { DISCORD_SITE_DEFAULT_SCOPES } from "./discordSiteScopes";

/** @deprecated Use resolveDiscordScopesForPageAccessSettings or DISCORD_SITE_DEFAULT_SCOPES. */
export const DISCORD_SITE_SCOPES = DISCORD_SITE_DEFAULT_SCOPES;

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getDiscordRedirectUri(origin?: string): string {
  if (origin && isLocalOrigin(origin)) {
    return `${origin.replace(/\/$/, "")}/callback/discord`;
  }
  return DISCORD_CALLBACK_URL;
}

export function getDiscordAppCredentials(origin?: string) {
  const clientId =
    process.env.AUTH_DISCORD_ID?.trim() ??
    process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret =
    process.env.AUTH_DISCORD_SECRET?.trim() ??
    process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("AUTH_DISCORD_ID and AUTH_DISCORD_SECRET are required.");
  }
  return {
    clientId,
    clientSecret,
    redirectUri: getDiscordRedirectUri(origin),
  };
}
