import type { Doc, Id } from "../_generated/dataModel";

export const SITE_ACCESS_GRANT_TTL_MS = 15 * 60 * 1000;

const DISCORD_ADMINISTRATOR = BigInt(0x8);
const DISCORD_MANAGE_GUILD = BigInt(0x20);

type DiscordGuild = {
  id: string;
  owner?: boolean;
  permissions?: string;
};

type MockBot = {
  ownerUserId: Id<"users">;
  collaboratorUserIds?: Id<"users">[];
  linkedGuildId?: string;
};

function hasManageGuildPermission(guild: DiscordGuild): boolean {
  if (guild.owner) return true;
  const perms = BigInt(guild.permissions ?? "0");
  if ((perms & DISCORD_ADMINISTRATOR) !== BigInt(0)) return true;
  return (perms & DISCORD_MANAGE_GUILD) !== BigInt(0);
}

function hasAdministratorPermission(guild: DiscordGuild): boolean {
  if (guild.owner) return true;
  const perms = BigInt(guild.permissions ?? "0");
  return (perms & DISCORD_ADMINISTRATOR) !== BigInt(0);
}

export async function evaluateSiteAccess(input: {
  site: Doc<"sites">;
  mockBot: MockBot | null;
  meridianUser: Doc<"users"> | null;
  accessToken: string;
}): Promise<{ allowed: boolean; meridianUserId?: Id<"users">; reason?: string }> {
  const { site, mockBot, meridianUser, accessToken } = input;

  if (meridianUser && site.ownerUserId === meridianUser._id) {
    return { allowed: true, meridianUserId: meridianUser._id };
  }

  if (mockBot && meridianUser && mockBot.ownerUserId === meridianUser._id) {
    return { allowed: true, meridianUserId: meridianUser._id };
  }

  if (
    site.accessSettings.allowCollaborators &&
    mockBot &&
    meridianUser &&
    mockBot.collaboratorUserIds?.includes(meridianUser._id)
  ) {
    return { allowed: true, meridianUserId: meridianUser._id };
  }

  const guildId = site.linkedGuildId ?? mockBot?.linkedGuildId;
  if (
    guildId &&
    (site.accessSettings.allowGuildAdministrators ||
      site.accessSettings.allowManageServer)
  ) {
    const guildRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (guildRes.ok) {
      const guilds = (await guildRes.json()) as DiscordGuild[];
      const guild = guilds.find((entry) => entry.id === guildId);
      if (guild) {
        const adminOk =
          site.accessSettings.allowGuildAdministrators &&
          hasAdministratorPermission(guild);
        const manageOk =
          site.accessSettings.allowManageServer && hasManageGuildPermission(guild);
        if (adminOk || manageOk) {
          return { allowed: true, meridianUserId: meridianUser?._id };
        }
      }
    }
  }

  if (!meridianUser) {
    return {
      allowed: false,
      reason:
        "This Discord account is not linked to Dock. Log in to Dock with the same Discord account, then try again.",
    };
  }

  return { allowed: false, reason: "You do not have access to this staff panel." };
}
