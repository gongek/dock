"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import { DockBrand } from "@/components/dashboard/dock-brand";
import { formatDockPlanLabel } from "@/lib/pricing";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/sites", label: "Sites", exact: false },
] as const;

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-zinc-900 text-zinc-100"
          : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
      }`}
    >
      {label}
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const syncMeridianPlan = useAction(api.meridian.planSync.syncCurrentUserMeridianPlan);
  const syncedMeridianPlanRef = useRef(false);

  useEffect(() => {
    if (syncedMeridianPlanRef.current) {
      return;
    }
    syncedMeridianPlanRef.current = true;
    void syncMeridianPlan();
  }, [syncMeridianPlan]);

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <div className="flex min-h-full flex-1">
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950">
        <div className="flex justify-center px-4 py-5">
          <DockBrand />
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <NavLink key={item.href} href={item.href} label={item.label} active={active} />
            );
          })}
        </nav>

        <div className="mt-auto border-t border-zinc-800/80 px-4 py-4">
          {user ? (
            <div className="flex items-center gap-2.5">
              {user.image ? (
                <img src={user.image} alt="" className="size-7 shrink-0 rounded-full" />
              ) : (
                <div className="size-7 shrink-0 rounded-full bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-200">
                  {user.name ?? "Account"}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {formatDockPlanLabel(user.ownerPlan)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Sign out"
                title="Sign out"
                className="flex shrink-0 items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-500/15 hover:text-red-400"
              >
                <i className="bx bx-log-out rotate-180 text-base leading-none" aria-hidden />
              </button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Loading account…</p>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
