"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { DockLogo } from "@/components/dock-logo";
import { SiteFooter } from "@/components/site-footer";

export function LoginPage() {
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleMeridianLogin() {
    setError(null);
    setPending(true);
    try {
      await signIn("meridian", { redirectTo: `${window.location.origin}/dashboard` });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not start Meridian login.",
      );
      setPending(false);
    }
  }

  async function handleDiscordLogin() {
    setError(null);
    setPending(true);
    try {
      await signIn("discord", { redirectTo: `${window.location.origin}/dashboard` });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not start Discord login.",
      );
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <DockLogo className="h-auto w-40" />
        <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-sm font-medium tracking-wide text-zinc-200">
              Log in
            </h1>
            <p className="text-xs text-zinc-500">
              Continue with Meridian or Discord
            </p>
          </div>
          {isLoading ? (
            <p className="text-xs text-zinc-600">Loading</p>
          ) : isAuthenticated ? (
            <>
              <p className="text-xs text-zinc-400">
                Logged in
                {user?.name ? ` as ${user.name}` : " with Meridian"}
              </p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full rounded-full border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
              >
                Sign out
              </button>
              <Link
                href="/dashboard"
                className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Go to dashboard
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleMeridianLogin()}
                disabled={pending}
                className="w-full rounded-full border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? "Redirecting…" : "Continue with Meridian"}
              </button>
              <button
                type="button"
                onClick={() => void handleDiscordLogin()}
                disabled={pending}
                className="w-full rounded-full border border-[#5865F2]/40 bg-[#5865F2]/10 px-5 py-2.5 text-sm text-zinc-100 transition-colors hover:border-[#5865F2]/70 hover:bg-[#5865F2]/20 disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? "Redirecting…" : "Continue with Discord"}
              </button>
              {error ? (
                <p className="text-xs text-red-400/90" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
