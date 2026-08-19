"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";
import { api } from "../../convex/_generated/api";
import { DockLogo } from "@/components/dock-logo";
import { SiteFooter } from "@/components/site-footer";

export function DashboardPage() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const setEmail = useMutation(api.users.setEmail);
  const [email, setEmailInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const needsEmail = user?.discordId && !user.email;

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await setEmail({ email });
      setEmailInput("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save your email.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <DockLogo className="h-auto w-40" />
        <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
          {user === undefined ? (
            <p className="text-xs text-zinc-600">Loading…</p>
          ) : needsEmail ? (
            <>
              <div className="flex flex-col gap-1">
                <h1 className="text-sm font-medium tracking-wide text-zinc-200">
                  Enter your email
                </h1>
                <p className="text-xs text-zinc-500">
                  Discord did not share an email for this account. Add one to
                  continue.
                </p>
              </div>
              <form
                onSubmit={(event) => void handleEmailSubmit(event)}
                className="flex w-full flex-col gap-3"
              >
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmailInput(event.target.value)}
                  placeholder="you@example.com"
                  disabled={pending}
                  className="w-full rounded-full border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-zinc-500 focus:outline-none disabled:cursor-wait disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-full border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-wait disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Continue"}
                </button>
                {error ? (
                  <p className="text-xs text-red-400/90" role="alert">
                    {error}
                  </p>
                ) : null}
              </form>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h1 className="text-sm font-medium tracking-wide text-zinc-200">
                  Dashboard
                </h1>
                <p className="text-xs text-zinc-500">
                  {user?.name ? `Welcome back, ${user.name}` : "Welcome back"}
                </p>
              </div>
              {user?.email ? (
                <p className="text-xs text-zinc-400">{user.email}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full rounded-full border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
      <SiteFooter leading={{ label: "Home", href: "/" }} />
    </div>
  );
}
