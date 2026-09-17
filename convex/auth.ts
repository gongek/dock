import { convexAuth } from "@convex-dev/auth/server";
// @ts-expect-error configDefaults is exported at runtime but omitted from types.
import { configDefaults } from "../node_modules/@convex-dev/auth/dist/server/provider_utils.js";
import Discord from "./discord";
import Meridian from "./meridian";
import {
  ALLOWED_REDIRECT_ORIGINS,
  DOCK_SITE_URL,
  isDockSubdomainRedirectOrigin,
  isLocalRedirectOrigin,
} from "./oauth";
import { resolveExistingUserId } from "./userIdentity";
import {
  DISCORD_EMAIL_REQUIRED,
  hasUsableEmail,
  sanitizeUserProfile,
} from "./userProfile";

export const authConfig = {
  callbacks: {
    async redirect({ redirectTo }: { redirectTo: string }) {
      const baseUrl = siteUrl();
      if (redirectTo.startsWith("?") || redirectTo.startsWith("/")) {
        return `${baseUrl}${redirectTo}`;
      }
      if (
        isLocalRedirectOrigin(redirectTo) ||
        isDockSubdomainRedirectOrigin(redirectTo) ||
        ALLOWED_REDIRECT_ORIGINS.some((origin) =>
          isAllowedOrigin(redirectTo, origin),
        )
      ) {
        return redirectTo;
      }
      throw new Error(
        `Invalid \`redirectTo\` ${redirectTo} for configured SITE_URL: ${baseUrl}`,
      );
    },
    async createOrUpdateUser(ctx: any, args: any) {
      const providerId = args.provider?.id ?? "";
      const profile = sanitizeUserProfile(
        (args.profile ?? {}) as Record<string, unknown>,
        providerId,
      );

      const userId = await resolveExistingUserId(ctx, {
        existingUserId: args.existingUserId ?? null,
        profile,
      });

      if (!userId && providerId === "discord" && !hasUsableEmail(profile.email)) {
        throw new Error(DISCORD_EMAIL_REQUIRED);
      }

      const userData = {
        ...profile,
        ...(hasUsableEmail(profile.email)
          ? { emailVerificationTime: Date.now() }
          : {}),
      };

      if (userId) {
        await ctx.db.patch(userId, userData);
        return userId;
      }

      return await ctx.db.insert("users", userData);
    },
  },
};

function siteUrl() {
  return (process.env.SITE_URL ?? DOCK_SITE_URL).replace(/\/$/, "");
}

function isAllowedOrigin(redirectTo: string, origin: string) {
  if (!redirectTo.startsWith(origin)) {
    return false;
  }
  const after = redirectTo[origin.length];
  return after === undefined || after === "?" || after === "/";
}

export async function resolveRedirectDestination(redirectTo?: string) {
  if (redirectTo !== undefined) {
    return authConfig.callbacks.redirect({ redirectTo });
  }
  return siteUrl();
}

const convexAuthOptions = {
  providers: [Meridian, Discord],
  callbacks: authConfig.callbacks,
};

export const materializedAuthConfig = configDefaults(convexAuthOptions);

export function getDiscordAuthProvider() {
  const provider = materializedAuthConfig.providers.find(
    (candidate: { id: string }) => candidate.id === "discord",
  );
  if (!provider) {
    throw new Error("Discord provider is not configured");
  }
  return provider;
}

export function getMeridianAuthProvider() {
  const provider = materializedAuthConfig.providers.find(
    (candidate: { id: string }) => candidate.id === "meridian",
  );
  if (!provider) {
    throw new Error("Meridian provider is not configured");
  }
  return provider;
}

export const { auth, signIn, signOut, store, isAuthenticated } =
  convexAuth(convexAuthOptions);
