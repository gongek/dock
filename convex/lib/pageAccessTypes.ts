import { v } from "convex/values";

export const pageAccessModeValidator = v.union(
  v.literal("public"),
  v.literal("authenticated"),
  v.literal("staff"),
  v.literal("roles"),
  v.literal("whitelist"),
);

export const pageAccessSettingsValidator = v.object({
  mode: pageAccessModeValidator,
  allowedRoleIds: v.optional(v.array(v.string())),
  allowedUserIds: v.optional(v.array(v.string())),
});

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

export function normalizePageAccessSettings(
  raw: PageAccessSettings | undefined | null,
): PageAccessSettings {
  if (!raw || raw.mode === "public") {
    return DEFAULT_PAGE_ACCESS_SETTINGS;
  }
  return {
    mode: raw.mode,
    ...(raw.allowedRoleIds?.length
      ? { allowedRoleIds: normalizeIdList(raw.allowedRoleIds) }
      : {}),
    ...(raw.allowedUserIds?.length
      ? { allowedUserIds: normalizeIdList(raw.allowedUserIds) }
      : {}),
  };
}

export function normalizeIdList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function resolvePageAccessSettings(
  raw: PageAccessSettings | undefined | null,
): PageAccessSettings {
  return normalizePageAccessSettings(raw);
}

export function isProtectedPageAccess(settings: PageAccessSettings): boolean {
  return settings.mode !== "public";
}

export function validatePageAccessSettings(input: {
  settings: PageAccessSettings;
  linkedGuildId?: string | null;
}): PageAccessSettings {
  const settings = normalizePageAccessSettings(input.settings);
  if (settings.mode === "roles") {
    if (!input.linkedGuildId?.trim()) {
      throw new Error("Link a Discord guild before restricting pages by role.");
    }
    if (!settings.allowedRoleIds?.length) {
      throw new Error("Add at least one Discord role ID.");
    }
  }
  if (settings.mode === "whitelist" && !settings.allowedUserIds?.length) {
    throw new Error("Add at least one Discord user ID.");
  }
  return settings;
}

export function pageAccessSettingsForPage(page: {
  pageAccessSettings?: PageAccessSettings | null;
}): PageAccessSettings {
  return resolvePageAccessSettings(page.pageAccessSettings);
}

export function isPublicPageAccess(page: {
  pageAccessSettings?: PageAccessSettings | null;
}): boolean {
  return !isProtectedPageAccess(pageAccessSettingsForPage(page));
}
