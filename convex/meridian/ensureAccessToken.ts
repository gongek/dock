"use node";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { meridianFetch } from "../oauth";
import { getMeridianOAuthCredentials } from "./credentials";

const MERIDIAN_TOKEN_URL = "https://meridian.surf/api/oauth/token";

export type MeridianAuthContext = {
  userId: Id<"users"> | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
};

function normalizeExpirySeconds(expiresAt: number | null | undefined): number | null {
  if (expiresAt == null || !Number.isFinite(expiresAt)) {
    return null;
  }
  if (expiresAt > 1e12) {
    return Math.floor(expiresAt / 1000);
  }
  return Math.floor(expiresAt);
}

function accessTokenNeedsRefresh(expiresAt: number | null | undefined): boolean {
  const expirySec = normalizeExpirySeconds(expiresAt ?? null);
  if (expirySec == null) {
    return false;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  return expirySec <= nowSec + 60;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  scope?: string;
};

async function refreshMeridianAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  const credentials = getMeridianOAuthCredentials();
  if (!credentials) {
    throw new Error("Meridian OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  });

  const response = await meridianFetch(MERIDIAN_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Meridian token refresh failed (${response.status}).`);
  }

  return (await response.json()) as TokenResponse;
}

export async function ensureMeridianAccessToken(
  ctx: ActionCtx,
  authContext: MeridianAuthContext,
): Promise<string | null> {
  let accessToken = authContext.accessToken?.trim() || null;

  const shouldRefresh =
    !accessToken || accessTokenNeedsRefresh(authContext.expiresAt);
  if (!shouldRefresh) {
    return accessToken;
  }

  const refreshToken = authContext.refreshToken?.trim();
  if (!refreshToken || !authContext.userId) {
    return accessToken;
  }

  const refreshed = await refreshMeridianAccessToken(refreshToken);
  const nextAccessToken = refreshed.access_token?.trim();
  if (!nextAccessToken) {
    throw new Error("Meridian token refresh returned no access token.");
  }

  const expiresAt =
    typeof refreshed.expires_at === "number"
      ? refreshed.expires_at
      : typeof refreshed.expires_in === "number"
        ? Math.floor(Date.now() / 1000) + refreshed.expires_in
        : undefined;

  await ctx.runMutation(internal.meridian.tokens.patchTokenForUser, {
    userId: authContext.userId,
    accessToken: nextAccessToken,
    refreshToken: refreshed.refresh_token?.trim() || refreshToken,
    expiresAt,
    scope: refreshed.scope,
  });

  return nextAccessToken;
}
