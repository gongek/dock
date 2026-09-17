import type { GenericActionCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { discordAvatarUrl } from "./discordProfile";
import { getDiscordAppCredentials } from "./discordAppCredentials";
import { evaluateSiteAccess } from "./siteAccessCore";
import type { SiteDiscordOAuthState } from "./siteDiscordState";
import { verifySiteOwnerClaim } from "./siteOwnerClaim";

type ActionCtx = Pick<
  GenericActionCtx<DataModel>,
  "runQuery" | "runMutation"
>;

export type SiteDiscordOAuthResult = {
  siteId: Id<"sites">;
  siteSlug: string;
  returnTo: string;
  discordUserId: string;
  accessToken: string;
  expiresAt: number;
};

export async function completeSiteDiscordOAuth(
  ctx: ActionCtx,
  args: {
    code: string;
    state: SiteDiscordOAuthState;
  },
): Promise<SiteDiscordOAuthResult> {
  const config = getDiscordAppCredentials(args.state.origin);
  const { siteSlug, returnTo } = args.state;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: config.redirectUri,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error("Discord token exchange failed.");
  }
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  const accessToken = tokenData.access_token?.trim();
  if (!accessToken) {
    throw new Error("Discord did not return an access token.");
  }

  const userRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) {
    throw new Error("Could not load Discord profile.");
  }
  const user = (await userRes.json()) as {
    id?: string;
    username?: string;
    global_name?: string | null;
    avatar?: string | null;
    discriminator?: string;
  };
  const discordUserId = user.id?.trim();
  if (!discordUserId) {
    throw new Error("Discord did not return a user id.");
  }
  const username = user.username?.trim() || undefined;
  const globalName = user.global_name?.trim() || undefined;
  const avatarUrl = discordAvatarUrl({
    id: discordUserId,
    username,
    global_name: user.global_name,
    avatar: user.avatar,
    discriminator: user.discriminator,
  });

  const site: Doc<"sites"> | null = await ctx.runQuery(
    internal.siteDiscordAuthInternal.getSiteBySlugInternal,
    { slug: siteSlug },
  );
  if (!site) {
    throw new Error("Site not found.");
  }

  await ctx.runMutation(internal.siteDiscordAuthInternal.storeDiscordSessionInternal, {
    discordUserId,
    accessToken,
    expiresIn: tokenData.expires_in ?? 604800,
    username,
    globalName,
    avatarUrl,
  });

  let verifiedOwnerId: Id<"users"> | null = null;
  if (
    args.state.dockUserId &&
    args.state.ownerSig &&
    args.state.dockUserId === site.ownerUserId &&
    (await verifySiteOwnerClaim({
      siteSlug: args.state.siteSlug,
      origin: args.state.origin,
      dockUserId: args.state.dockUserId,
      ownerSig: args.state.ownerSig,
    }))
  ) {
    verifiedOwnerId = args.state.dockUserId;
  }

  if (verifiedOwnerId) {
    const owner = await ctx.runQuery(
      internal.siteDiscordAuthInternal.getUserByIdInternal,
      { userId: verifiedOwnerId },
    );
    if (!owner) {
      throw new Error("Site owner not found.");
    }

    const discordAccountOwner = await ctx.runQuery(
      internal.siteDiscordAuthInternal.getUserByDiscordIdInternal,
      { discordUserId },
    );
    if (discordAccountOwner && discordAccountOwner._id !== owner._id) {
      await ctx.runMutation(internal.userMerge.mergeUserAccountsInternal, {
        primaryUserId: owner._id,
        secondaryUserId: discordAccountOwner._id,
        discordUserId,
      });
    } else if (owner.discordId !== discordUserId) {
      await ctx.runMutation(
        internal.siteDiscordAuthInternal.linkDiscordIdToOwnerInternal,
        {
          userId: owner._id,
          discordUserId,
        },
      );
    }

    await ctx.runMutation(internal.siteAccess.upsertSiteAccessGrantInternal, {
      siteId: site._id,
      discordUserId,
      meridianUserId: owner._id,
      allowed: true,
    });

    return {
      siteId: site._id,
      siteSlug,
      returnTo,
      discordUserId,
      accessToken,
      expiresAt: Date.now() + (tokenData.expires_in ?? 604800) * 1000,
    };
  }

  const mockBot = site.meridianBotId
    ? await ctx.runQuery(internal.siteDiscordAuthInternal.getMockBotInternal, {
        meridianBotId: site.meridianBotId,
      })
    : null;
  const meridianUser = await ctx.runQuery(
    internal.siteDiscordAuthInternal.getUserByDiscordIdInternal,
    { discordUserId },
  );
  const access = await evaluateSiteAccess({
    site,
    mockBot,
    meridianUser,
    accessToken,
  });
  if (!access.allowed) {
    throw new Error(
      access.reason ?? "You do not have access to this staff panel.",
    );
  }
  await ctx.runMutation(internal.siteAccess.upsertSiteAccessGrantInternal, {
    siteId: site._id,
    discordUserId,
    meridianUserId: access.meridianUserId,
    allowed: true,
  });

  return {
    siteId: site._id,
    siteSlug,
    returnTo,
    discordUserId,
    accessToken,
    expiresAt: Date.now() + (tokenData.expires_in ?? 604800) * 1000,
  };
}
