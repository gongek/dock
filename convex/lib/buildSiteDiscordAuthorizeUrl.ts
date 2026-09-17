import { getDiscordAppCredentials } from "./discordAppCredentials";
import { DISCORD_SITE_DEFAULT_SCOPES } from "./discordSiteScopes";
import {
  encodeSiteDiscordOAuthState,
  type SiteDiscordOAuthState,
} from "./siteDiscordState";
import type { Id } from "../_generated/dataModel";

export function buildSiteDiscordAuthorizeUrlForState(input: {
  siteSlug: string;
  returnTo: string;
  origin: string;
  scopes?: string;
  dockUserId?: Id<"users">;
  ownerSig?: string;
}): string {
  const origin = input.origin.trim().replace(/\/$/, "");
  const returnTo = input.returnTo.trim();
  if (!returnTo.startsWith(`${origin}/`) && returnTo !== origin) {
    throw new Error("Invalid OAuth state.");
  }

  const config = getDiscordAppCredentials(origin);
  const statePayload: SiteDiscordOAuthState = {
    kind: "site",
    siteSlug: input.siteSlug.trim().toLowerCase(),
    returnTo,
    origin,
    ...(input.dockUserId && input.ownerSig
      ? { dockUserId: input.dockUserId, ownerSig: input.ownerSig }
      : {}),
  };
  const state = encodeSiteDiscordOAuthState(statePayload);

  const authorize = new URL("https://discord.com/api/oauth2/authorize");
  authorize.searchParams.set("client_id", config.clientId);
  authorize.searchParams.set("redirect_uri", config.redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", input.scopes?.trim() || DISCORD_SITE_DEFAULT_SCOPES);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("prompt", "consent");
  return authorize.toString();
}
