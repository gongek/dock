import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
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

function assertSingleUserId(
  candidates: Array<Id<"users"> | null | undefined>,
): Id<"users"> | null {
  const unique = [
    ...new Set(
      candidates.filter((candidate): candidate is Id<"users"> => candidate != null),
    ),
  ];

  if (unique.length > 1) {
    throw new Error(ACCOUNT_IDENTITY_CONFLICT);
  }

  return unique[0] ?? null;
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

  return assertSingleUserId([
    validatedExistingUserId,
    userByEmail,
    userByDiscordId,
    userByMeridianId,
  ]);
}
