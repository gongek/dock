import { convexAuth } from "@convex-dev/auth/server";
import Discord from "./discord";
import Meridian from "./meridian";
import {
  ALLOWED_REDIRECT_ORIGINS,
  DOCK_SITE_URL,
  isLocalRedirectOrigin,
} from "./oauth";

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

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Meridian, Discord],
  callbacks: {
    async redirect({ redirectTo }) {
      const baseUrl = siteUrl();
      if (redirectTo.startsWith("?") || redirectTo.startsWith("/")) {
        return `${baseUrl}${redirectTo}`;
      }
      if (
        isLocalRedirectOrigin(redirectTo) ||
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
  },
});
