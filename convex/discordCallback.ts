import { parse as parseCookies } from "cookie";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getDiscordAuthProvider, resolveRedirectDestination } from "./auth";
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
  DISCORD_EMAIL_REQUIRED,
  hasUsableEmail,
  sanitizeUserProfile,
} from "./userProfile";

const providerId = "discord";

function getCookies(request: Request) {
  return parseCookies(request.headers.get("Cookie") ?? "");
}

function randomToken(length = 32) {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

function loginErrorUrl(destinationUrl: string) {
  const url = new URL(destinationUrl);
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("error", "discord");
  return url.toString();
}

function signupEmailUrl(destinationUrl: string, token: string) {
  const url = new URL(destinationUrl);
  url.pathname = "/signup/email";
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
}

type ActionCtx = Parameters<typeof callUserOAuth>[0];

async function redirectToEmailForm(
  ctx: ActionCtx,
  args: {
    providerAccountId: string;
    profile: Record<string, unknown>;
    signature: string;
    destinationUrl: string;
  },
) {
  const token = randomToken();
  await ctx.runMutation(internal.discordSignup.createPending, {
    token,
    providerAccountId: args.providerAccountId,
    profile: sanitizeUserProfile(
      { ...args.profile, discordId: args.providerAccountId },
      "discord",
    ),
    signature: args.signature,
    redirectTo: args.destinationUrl,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: signupEmailUrl(args.destinationUrl, token),
      "Cache-Control": "must-revalidate",
    },
  });
}

async function handleDiscordCallback(ctx: ActionCtx, request: Request) {
  const url = new URL(request.url);
  const provider = getDiscordAuthProvider();
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
    throw new Error("Discord profile must return a string ID");
  }

  const sanitized = sanitizeUserProfile(
    { ...profileFromCallback, discordId: id },
    "discord",
  );
  const existing = await ctx.runQuery(
    internal.discordSignup.getExistingDiscordUser,
    { providerAccountId: id },
  );

  if (!hasUsableEmail(sanitized.email) && existing?.userId == null) {
    return await redirectToEmailForm(ctx, {
      providerAccountId: id,
      profile: sanitized,
      signature,
      destinationUrl,
    });
  }

  try {
    const verificationCode = await callUserOAuth(ctx, {
      provider: providerId,
      providerAccountId: id,
      profile: sanitized,
      signature,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: setURLSearchParam(destinationUrl, "code", verificationCode),
        "Cache-Control": "must-revalidate",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes(DISCORD_EMAIL_REQUIRED)) {
      return await redirectToEmailForm(ctx, {
        providerAccountId: id,
        profile: sanitized,
        signature,
        destinationUrl,
      });
    }
    throw error;
  }
}

export const discordOAuthCallback = httpAction(async (ctx, request) => {
  try {
    return await handleDiscordCallback(ctx, request);
  } catch (error) {
    logError(error);
    const cookies = getCookies(request);
    const maybeRedirectTo = useRedirectToParam(providerId, cookies);
    const destinationUrl = await resolveRedirectDestination(
      maybeRedirectTo?.redirectTo,
    );
    return Response.redirect(loginErrorUrl(destinationUrl));
  }
});
