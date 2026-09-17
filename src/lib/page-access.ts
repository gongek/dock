export type PageAccessMode =
  | "public"
  | "authenticated"
  | "staff"
  | "roles"
  | "whitelist";

export type PageAccessSettings = {
  mode: PageAccessMode;
  allowedRoleIds?: string[];
  allowedUserIds?: string[];
};

export const DEFAULT_PAGE_ACCESS_SETTINGS: PageAccessSettings = {
  mode: "public",
};

export const PAGE_ACCESS_MODE_OPTIONS: Array<{
  value: PageAccessMode;
  label: string;
  description?: string;
}> = [
  { value: "public", label: "Public", description: "Anyone can view" },
  { value: "authenticated", label: "Signed in", description: "Must sign in with Discord" },
  { value: "staff", label: "Staff", description: "Site staff only (from Settings → Staff access)" },
  { value: "roles", label: "Roles", description: "Must have a listed Discord role" },
  { value: "whitelist", label: "Whitelist", description: "Only listed Discord user IDs" },
];

export function resolvePageAccessSettings(
  raw: PageAccessSettings | undefined | null,
): PageAccessSettings {
  if (!raw || raw.mode === "public") {
    return DEFAULT_PAGE_ACCESS_SETTINGS;
  }
  return {
    mode: raw.mode,
    ...(raw.allowedRoleIds?.length ? { allowedRoleIds: raw.allowedRoleIds } : {}),
    ...(raw.allowedUserIds?.length ? { allowedUserIds: raw.allowedUserIds } : {}),
  };
}

export function isProtectedPageAccess(settings: PageAccessSettings): boolean {
  return settings.mode !== "public";
}

export function parseIdListInput(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(/[\s,]+/)) {
    const trimmed = part.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function formatIdListInput(values: string[] | undefined): string {
  return values?.join("\n") ?? "";
}

const DISCORD_SCOPE_IDENTIFY = "identify";
const DISCORD_SCOPE_GUILDS = "guilds";
const DISCORD_SCOPE_GUILDS_MEMBERS_READ = "guilds.members.read";

/** Minimum scope for bot-subdomain sign-in (identity only). */
export const DISCORD_SITE_DEFAULT_SCOPES = DISCORD_SCOPE_IDENTIFY;

export function resolveDiscordScopesForPageAccess(settings: PageAccessSettings): string {
  const scopes = new Set<string>([DISCORD_SCOPE_IDENTIFY]);
  if (settings.mode === "staff" || settings.mode === "roles") {
    scopes.add(DISCORD_SCOPE_GUILDS);
  }
  if (settings.mode === "roles") {
    scopes.add(DISCORD_SCOPE_GUILDS_MEMBERS_READ);
  }
  return [DISCORD_SCOPE_IDENTIFY, DISCORD_SCOPE_GUILDS, DISCORD_SCOPE_GUILDS_MEMBERS_READ]
    .filter((scope) => scopes.has(scope))
    .join(" ");
}

export function buildSiteDiscordAuthUrl(input: {
  slug: string;
  returnTo: string;
  scopes?: string;
}): string {
  const params = new URLSearchParams({
    slug: input.slug,
    returnTo: input.returnTo,
  });
  if (input.scopes?.trim()) {
    params.set("scopes", input.scopes.trim());
  }
  return `/auth/discord/site?${params.toString()}`;
}
