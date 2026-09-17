import type { Doc } from "../_generated/dataModel";
import { evaluateSiteAccess } from "./siteAccessCore";
import {
  isProtectedPageAccess,
  pageAccessSettingsForPage,
  type PageAccessSettings,
  resolvePageAccessSettings,
} from "./pageAccessTypes";

export type PageAccessResult = {
  allowed: boolean;
  reason?: string;
  code?: "public" | "authenticated" | "staff" | "roles" | "whitelist" | "reauth";
};

type DiscordGuildMember = {
  roles?: string[];
};

type MockBot = {
  ownerUserId: Doc<"users">["_id"];
  collaboratorUserIds?: Doc<"users">["_id"][];
  linkedGuildId?: string;
};

async function fetchGuildMemberRoles(input: {
  guildId: string;
  accessToken: string;
}): Promise<{ ok: true; roles: string[] } | { ok: false; status: number }> {
  const memberRes = await fetch(
    `https://discord.com/api/v10/users/@me/guilds/${input.guildId}/member`,
    {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    },
  );
  if (!memberRes.ok) {
    return { ok: false, status: memberRes.status };
  }
  const member = (await memberRes.json()) as DiscordGuildMember;
  return { ok: true, roles: member.roles ?? [] };
}

function isSiteOwnerByDiscord(input: {
  site: Doc<"sites">;
  mockBot: MockBot | null;
  meridianUser: Doc<"users"> | null;
}): boolean {
  const { site, mockBot, meridianUser } = input;
  if (meridianUser && site.ownerUserId === meridianUser._id) return true;
  if (mockBot && meridianUser && mockBot.ownerUserId === meridianUser._id) return true;
  return false;
}

export async function evaluatePageAccess(input: {
  site: Doc<"sites">;
  pageAccessSettings: PageAccessSettings | undefined | null;
  discordUserId?: string;
  accessToken?: string;
  mockBot?: MockBot | null;
  meridianUser?: Doc<"users"> | null;
}): Promise<PageAccessResult> {
  const settings = resolvePageAccessSettings(input.pageAccessSettings);
  if (!isProtectedPageAccess(settings)) {
    return { allowed: true, code: "public" };
  }

  if (!input.discordUserId?.trim()) {
    return {
      allowed: false,
      reason: "Sign in with Discord to view this page.",
      code: settings.mode,
    };
  }

  if (
    isSiteOwnerByDiscord({
      site: input.site,
      mockBot: input.mockBot ?? null,
      meridianUser: input.meridianUser ?? null,
    })
  ) {
    return { allowed: true, code: settings.mode };
  }

  if (settings.mode === "authenticated") {
    return { allowed: true, code: "authenticated" };
  }

  if (settings.mode === "whitelist") {
    const allowed = settings.allowedUserIds?.includes(input.discordUserId) ?? false;
    return allowed
      ? { allowed: true, code: "whitelist" }
      : {
          allowed: false,
          reason: "You are not on the allowlist for this page.",
          code: "whitelist",
        };
  }

  if (!input.accessToken?.trim()) {
    return {
      allowed: false,
      reason: "Sign in again with Discord to verify access to this page.",
      code: "reauth",
    };
  }

  if (settings.mode === "staff") {
    const staff = await evaluateSiteAccess({
      site: input.site,
      mockBot: input.mockBot ?? null,
      meridianUser: input.meridianUser ?? null,
      accessToken: input.accessToken,
    });
    return staff.allowed
      ? { allowed: true, code: "staff" }
      : {
          allowed: false,
          reason: staff.reason ?? "You do not have staff access to this page.",
          code: "staff",
        };
  }

  if (settings.mode === "roles") {
    const guildId = input.site.linkedGuildId ?? input.mockBot?.linkedGuildId;
    if (!guildId) {
      return {
        allowed: false,
        reason: "This page requires guild roles, but the site has no linked guild.",
        code: "roles",
      };
    }
    const allowedRoleIds = settings.allowedRoleIds ?? [];
    if (!allowedRoleIds.length) {
      return {
        allowed: false,
        reason: "This page has no allowed roles configured.",
        code: "roles",
      };
    }

    const member = await fetchGuildMemberRoles({
      guildId,
      accessToken: input.accessToken,
    });
    if (!member.ok) {
      if (member.status === 401 || member.status === 403) {
        return {
          allowed: false,
          reason: "Sign in again with Discord to verify your roles.",
          code: "reauth",
        };
      }
      return {
        allowed: false,
        reason: "Could not verify your Discord roles for this page.",
        code: "roles",
      };
    }

    const hasRole = allowedRoleIds.some((roleId) => member.roles.includes(roleId));
    return hasRole
      ? { allowed: true, code: "roles" }
      : {
          allowed: false,
          reason: "You do not have a required Discord role for this page.",
          code: "roles",
        };
  }

  return {
    allowed: false,
    reason: "You do not have access to this page.",
    code: settings.mode,
  };
}

export function isPublicPageAccess(page: {
  pageAccessSettings?: PageAccessSettings | null;
}): boolean {
  return !isProtectedPageAccess(pageAccessSettingsForPage(page));
}

export { pageAccessSettingsForPage } from "./pageAccessTypes";
