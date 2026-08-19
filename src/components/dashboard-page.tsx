"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DockLogo } from "@/components/dock-logo";
import { SiteFooter } from "@/components/site-footer";

export function DashboardPage() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <DockLogo className="h-auto w-40" />
        <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-sm font-medium tracking-wide text-zinc-200">
              Dashboard
            </h1>
            <p className="text-xs text-zinc-500">
              {user === undefined
                ? "Loading…"
                : user?.name
                  ? `Welcome back, ${user.name}`
                  : "Welcome back"}
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
        </div>
      </div>
      <SiteFooter leading={{ label: "Home", href: "/" }} />
    </div>
  );
}
