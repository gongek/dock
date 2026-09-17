"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function DashboardPage() {
  const user = useQuery(api.users.currentUser);
  const sites = useQuery(api.sites.listMySites);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-800/80 px-8 py-6">
        <h1 className="text-lg font-medium tracking-wide text-zinc-100">Overview</h1>
        <p className="mt-1 text-xs text-zinc-500">
          {user === undefined
            ? "Loading…"
            : user?.name
              ? `Welcome back, ${user.name}`
              : "Welcome back"}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-8 py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs text-zinc-500">Sites</p>
            <p className="mt-2 text-2xl font-medium text-zinc-100">
              {sites === undefined ? "—" : sites.sites.length}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {sites ? `On ${sites.plan} plan` : "Loading plan…"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs text-zinc-500">Account</p>
            <p className="mt-2 truncate text-sm font-medium text-zinc-200">
              {user?.email ?? user?.name ?? "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Signed in</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-medium text-zinc-200">Quick actions</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/sites"
              className="rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
            >
              Manage sites
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
