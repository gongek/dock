"use client";

import "boxicons/css/boxicons.min.css";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { LandingAtmosphere } from "@/components/landing/landing-atmosphere";
import { DiscordAltIcon, MeridianLogoIcon } from "@/components/oauth-icons";
import {
  isAllowedLoginReturnTo,
  resolveLoginRedirectTarget,
  resolveLoginReturnToSubtitle,
} from "@/lib/login-redirect";
import { legalPath } from "@/lib/policies/legalPath";
import { userFacingError } from "@/lib/user-facing-error";

function LoginButtonSpinner() {
  return (
    <i
      className="bx bx-loader-alt login-button-spinner shrink-0 text-base leading-none"
      aria-hidden
    />
  );
}

export function LoginPage({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const [error, setError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<
    "meridian" | "discord" | null
  >(null);
  const redirectTarget = resolveLoginRedirectTarget(
    returnTo && isAllowedLoginReturnTo(returnTo) ? returnTo : undefined,
  );
  const hasReturnTo = Boolean(returnTo?.trim() && isAllowedLoginReturnTo(returnTo));
  const subtitle = hasReturnTo && returnTo
    ? resolveLoginReturnToSubtitle(returnTo)
    : "Log in to manage your sites.";

  async function handleMeridianLogin() {
    setError(null);
    setPendingProvider("meridian");
    try {
      await signIn("meridian", { redirectTo: redirectTarget });
    } catch (caught) {
      setError(
        userFacingError(
          caught,
          "Could not start Meridian login. Try restarting the dev server.",
        ),
      );
      setPendingProvider(null);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  async function handleDiscordLogin() {
    setError(null);
    setPendingProvider("discord");
    try {
      await signIn("discord", { redirectTo: redirectTarget });
    } catch (caught) {
      setError(
        userFacingError(
          caught,
          "Could not start Discord login. Try restarting the dev server.",
        ),
      );
      setPendingProvider(null);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip">
      <main className="flex flex-1 flex-col">
          <section className="relative flex min-h-[100svh] flex-col px-6">
            <LandingAtmosphere compact subtle />
            <div className="login-page-fade-in relative z-10 flex flex-1 flex-col">
            <div className="flex flex-1 items-center justify-center py-16">
              <div className="relative z-10 w-full max-w-md">
                <div className="landing-card landing-card--static w-full p-8 sm:p-10">
                <div className="text-center">
                  <h1 className="flex items-center justify-center gap-3 text-3xl font-medium tracking-tight text-zinc-100 sm:text-4xl">
                    <Link
                      href="/"
                      className="shrink-0 transition-opacity hover:opacity-80"
                      aria-label="Back to homepage"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/dock-logo.svg"
                        alt=""
                        width={36}
                        height={36}
                        className="size-8 sm:size-9"
                      />
                    </Link>
                    Welcome
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
                    {subtitle}
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  {isAuthenticated ? (
                    <>
                      <div className="flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        {user?.image ? (
                          <img
                            src={user.image}
                            alt=""
                            className="h-8 w-8 rounded-full"
                          />
                        ) : null}
                        <div className="min-w-0 text-left">
                          <p className="truncate text-sm font-medium text-zinc-100">
                            {user?.name ?? "…"}
                          </p>
                          <p className="text-xs text-zinc-500">Signed in</p>
                        </div>
                      </div>
                      <Link
                        href={returnTo?.trim() ? redirectTarget : "/dashboard"}
                        className="flex w-full items-center justify-center rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
                      >
                        {returnTo?.trim() ? "Continue" : "Go to dashboard"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        className="flex w-full items-center justify-center rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleMeridianLogin()}
                        disabled={pendingProvider !== null}
                        aria-busy={pendingProvider === "meridian"}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-300 disabled:cursor-wait disabled:opacity-60"
                      >
                        {pendingProvider === "meridian" ? (
                          <LoginButtonSpinner />
                        ) : (
                          <MeridianLogoIcon className="h-4 w-4 shrink-0" />
                        )}
                        Continue with Meridian
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDiscordLogin()}
                        disabled={pendingProvider !== null}
                        aria-busy={pendingProvider === "discord"}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5865F2] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4c58d2] disabled:cursor-wait disabled:opacity-60"
                      >
                        {pendingProvider === "discord" ? (
                          <LoginButtonSpinner />
                        ) : (
                          <DiscordAltIcon className="h-4 w-4 shrink-0" />
                        )}
                        Continue with Discord
                      </button>
                      {error ? (
                        <p
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300"
                          role="alert"
                        >
                          {error}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
                </div>
              </div>
            </div>
            <p className="mx-auto w-full max-w-md shrink-0 px-6 pb-6 text-center text-xs leading-5 text-zinc-600">
              By continuing, you agree to our{" "}
              <Link
                href={legalPath("terms")}
                className="text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-200"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href={legalPath("privacy")}
                className="text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-200"
              >
                Privacy Policy
              </Link>
              .
            </p>
            </div>
          </section>
      </main>
    </div>
  );
}
