import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mergeUserAccounts } from "./lib/mergeUserAccounts";
import { hasUsableEmail } from "./userProfile";

export const ACCOUNT_IDENTITY_CONFLICT = "ACCOUNT_IDENTITY_CONFLICT";

export type IdentityProfile = {
  email?: string;
  discordId?: string;
  meridianId?: string;
};

type ResolveExistingUserIdArgs = {
  existingUserId: Id<"users"> | null;
  profile: IdentityProfile;
};

export function pickPrimaryUserId(
  candidates: Array<Id<"users">>,
  existingUserId: Id<"users"> | null,
): Id<"users"> {
  if (existingUserId && candidates.includes(existingUserId)) {
    return existingUserId;
  }
  const first = candidates[0];
  if (!first) {
    throw new Error(ACCOUNT_IDENTITY_CONFLICT);
  }
  return first;
}

function uniqueUserIds(
  candidates: Array<Id<"users"> | null | undefined>,
): Array<Id<"users">> {
  return [
    ...new Set(
      candidates.filter((candidate): candidate is Id<"users"> => candidate != null),
    ),
  ];
}

export async function resolveExistingUserId(
  ctx: MutationCtx,
  { existingUserId, profile }: ResolveExistingUserIdArgs,
): Promise<Id<"users"> | null> {
  let validatedExistingUserId: Id<"users"> | null = existingUserId;
  if (validatedExistingUserId) {
    const existing = await ctx.db.get(validatedExistingUserId);
    if (!existing) {
      validatedExistingUserId = null;
    }
  }

  let userByEmail: Id<"users"> | null = null;
  if (hasUsableEmail(profile.email)) {
    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", profile.email))
      .unique();
    userByEmail = existingByEmail?._id ?? null;
  }

  let userByDiscordId: Id<"users"> | null = null;
  if (profile.discordId) {
    const existingByDiscordId = await ctx.db
      .query("users")
      .withIndex("by_discord_id", (q) => q.eq("discordId", profile.discordId))
      .unique();
    userByDiscordId = existingByDiscordId?._id ?? null;
  }

  let userByMeridianId: Id<"users"> | null = null;
  if (profile.meridianId) {
    const existingByMeridianId = await ctx.db
      .query("users")
      .withIndex("by_meridian_id", (q) =>
        q.eq("meridianId", profile.meridianId),
      )
      .unique();
    userByMeridianId = existingByMeridianId?._id ?? null;
  }

  const candidates = uniqueUserIds([
    validatedExistingUserId,
    userByEmail,
    userByDiscordId,
    userByMeridianId,
  ]);

  if (candidates.length === 0) {
    return null;
  }

  const primaryUserId = pickPrimaryUserId(candidates, validatedExistingUserId);
  for (const secondaryUserId of candidates) {
    if (secondaryUserId === primaryUserId) {
      continue;
    }
    try {
      await mergeUserAccounts(ctx, {
        primaryUserId,
        secondaryUserId,
        discordUserId: profile.discordId,
      });
    } catch {
      throw new Error(ACCOUNT_IDENTITY_CONFLICT);
    }
  }

  return primaryUserId;
}
