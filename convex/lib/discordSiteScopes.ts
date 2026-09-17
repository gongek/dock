import type { PageAccessMode, PageAccessSettings } from "./pageAccessTypes";
import { resolvePageAccessSettings } from "./pageAccessTypes";

/** Minimum scope for any site Discord sign-in. */
export const DISCORD_SCOPE_IDENTIFY = "identify";
export const DISCORD_SCOPE_GUILDS = "guilds";
export const DISCORD_SCOPE_GUILDS_MEMBERS_READ = "guilds.members.read";

const SCOPE_ORDER = [
  DISCORD_SCOPE_IDENTIFY,
  DISCORD_SCOPE_GUILDS,
  DISCORD_SCOPE_GUILDS_MEMBERS_READ,
] as const;

/** Default for bot-subdomain gate: prove Discord identity only. */
export const DISCORD_SITE_DEFAULT_SCOPES = DISCORD_SCOPE_IDENTIFY;

export function resolveDiscordScopesForPageAccessMode(mode: PageAccessMode): string {
  const scopes = new Set<string>([DISCORD_SCOPE_IDENTIFY]);
  if (mode === "staff" || mode === "roles") {
    scopes.add(DISCORD_SCOPE_GUILDS);
  }
  if (mode === "roles") {
    scopes.add(DISCORD_SCOPE_GUILDS_MEMBERS_READ);
  }
  return SCOPE_ORDER.filter((scope) => scopes.has(scope)).join(" ");
}

export function resolveDiscordScopesForPageAccessSettings(
  settings: PageAccessSettings | undefined | null,
): string {
  return resolveDiscordScopesForPageAccessMode(
    resolvePageAccessSettings(settings).mode,
  );
}

export function mergeDiscordScopes(...scopeStrings: Array<string | undefined>): string {
  const scopes = new Set<string>();
  for (const scopeString of scopeStrings) {
    if (!scopeString?.trim()) continue;
    for (const part of scopeString.split(/\s+/)) {
      if (part) scopes.add(part);
    }
  }
  return SCOPE_ORDER.filter((scope) => scopes.has(scope)).join(" ");
}
