const BOT_HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
const SITE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export const RESERVED_SITE_SLUGS = new Set(["onboarding"]);

export function isReservedSiteSlug(slug: string): boolean {
  return RESERVED_SITE_SLUGS.has(slug.trim().toLowerCase());
}

export function normalizeSiteSlug(raw: string): string | null {
  const slug = raw.trim().toLowerCase();
  if (!slug || !SITE_SLUG_RE.test(slug)) return null;
  return slug;
}

export function isValidBotLabel(label: string): boolean {
  const trimmed = label.trim().toLowerCase();
  if (!trimmed || !BOT_HANDLE_RE.test(trimmed)) return false;
  if (/^[a-z0-9]{16,}$/i.test(trimmed) && !/^\d{17,20}$/.test(trimmed)) {
    return false;
  }
  return true;
}

export const DEFAULT_ACCESS_SETTINGS = {
  allowCollaborators: true,
  allowGuildAdministrators: true,
  allowManageServer: true,
} as const;

export const DEFAULT_CASE_URL_PATTERN = "/{case_slug}";

export const DEFAULT_SITE_THEME = {
  background: "#090909",
  foreground: "#ededed",
  surface: "#18181b",
  accent: "#a1a1aa",
} as const;
