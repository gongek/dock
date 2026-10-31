import { parse as parseCookies } from "cookie";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getMeridianAuthProvider, resolveRedirectDestination } from "./auth";
import { handleOAuth } from "../node_modules/@convex-dev/auth/dist/server/oauth/callback.js";
import { useRedirectToParam } from "../node_modules/@convex-dev/auth/dist/server/cookies.js";
import {
  defaultCookiesOptions,
  oAuthConfigToInternalProvider,
} from "../node_modules/@convex-dev/auth/dist/server/oauth/convexAuth.js";
import { setURLSearchParam } from "../node_modules/@convex-dev/auth/dist/server/implementation/redirects.js";
import { callUserOAuth } from "../node_modules/@convex-dev/auth/dist/server/implementation/mutations/userOAuth.js";
import { logError } from "../node_modules/@convex-dev/auth/dist/server/implementation/utils.js";
import {
  readMeridianStaffStatus,
  type MeridianUserinfoPayload,
} from "./meridian/userinfo";
import { resolveMeridianUserPlan } from "./meridian/planResolve";
import { sanitizeUserProfile } from "./userProfile";
import { ACCOUNT_IDENTITY_CONFLICT } from "./userIdentity";

const providerId = "meridian";

function getCookies(request: Request) {
  return parseCookies(request.headers.get("Cookie") ?? "");
}

function loginErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes(ACCOUNT_IDENTITY_CONFLICT)) {
    return "account_conflict";
  }
  return "meridian";
}

function loginErrorUrl(destinationUrl: string, error: unknown) {
  const url = new URL(destinationUrl);
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("error", loginErrorCode(error));
  return url.toString();
}

type ActionCtx = Parameters<typeof callUserOAuth>[0];

async function handleMeridianCallback(ctx: ActionCtx, request: Request) {
  const url = new URL(request.url);
  const provider = getMeridianAuthProvider();
  const cookies = getCookies(request);
  const maybeRedirectTo = useRedirectToParam(providerId, cookies);
  const destinationUrl = await resolveRedirectDestination(
    maybeRedirectTo?.redirectTo,
  );
  const params = url.searchParams;

  if (request.headers.get("Content-Type") === "application/x-www-form-urlencoded") {
    const formData = await request.formData();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        params.append(key, value);
      }
    }
  }

  const { profile, tokens, signature } = await handleOAuth(
    Object.fromEntries(params.entries()),
    cookies,
    {
      provider: await oAuthConfigToInternalProvider(provider),
      cookies: defaultCookiesOptions(providerId),
    },
  );

  const { id, ...profileFromCallback } = await provider.profile!(profile, tokens);
  if (typeof id !== "string") {
    throw new Error("Meridian profile must return a string ID");
  }

  const sanitized = sanitizeUserProfile(
    { ...profileFromCallback, meridianId: id },
    "meridian",
  );

  const verificationCode = await callUserOAuth(ctx, {
    provider: providerId,
    providerAccountId: id,
    profile: sanitized,
    signature,
  });

  const accessToken =
    typeof tokens.access_token === "string" ? tokens.access_token.trim() : "";
  if (accessToken) {
    await ctx.runMutation(internal.meridian.tokens.upsertTokenByProviderAccount, {
      providerAccountId: id,
      accessToken,
      refreshToken:
        typeof tokens.refresh_token === "string"
          ? tokens.refresh_token
          : undefined,
      expiresAt:
        typeof tokens.expires_at === "number" ? tokens.expires_at : undefined,
      scope: typeof tokens.scope === "string" ? tokens.scope : undefined,
    });

    try {
      const { plan: meridianPlan, isMeridianStaff, userinfo } =
        await resolveMeridianUserPlan(accessToken);
      const staffFromProfile = readMeridianStaffStatus({
        ...(profile as MeridianUserinfoPayload),
        ...userinfo,
      });
      await ctx.runMutation(internal.meridian.planSync.syncOwnerPlanOnMeridianLogin, {
        providerAccountId: id,
        meridianPlan,
        isMeridianStaff: isMeridianStaff || staffFromProfile,
      });
    } catch (planError) {
      logError(planError);
    }
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: setURLSearchParam(destinationUrl, "code", verificationCode),
      "Cache-Control": "must-revalidate",
    },
  });
}

export const meridianOAuthCallback = httpAction(async (ctx, request) => {
  try {
    return await handleMeridianCallback(ctx, request);
  } catch (error) {
    logError(error);
    const cookies = getCookies(request);
    const maybeRedirectTo = useRedirectToParam(providerId, cookies);
    const destinationUrl = await resolveRedirectDestination(
      maybeRedirectTo?.redirectTo,
    );
    return Response.redirect(loginErrorUrl(destinationUrl, error));
  }
});
