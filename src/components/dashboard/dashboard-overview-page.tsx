"use client";

import Link from "next/link";
import { useAction } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DashboardBotStat } from "@/components/dashboard/dashboard-bot-stat";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { SiteStatusChip } from "@/components/dashboard/site-status-chip";
import { useOpenDockSite } from "@/components/dashboard/use-open-dock-site";
import { formatCompactCount } from "@/lib/format-count";
import { formatUptimeMs } from "@/lib/format-uptime";
import { buildSiteEditUrl, formatSiteHost } from "@/lib/site-host";

type OverviewPayload = FunctionReturnType<
  typeof api.dashboardOverview.loadBotOverview
>;

export function DashboardOverviewPage() {
  const loadBotOverview = useAction(api.dashboardOverview.loadBotOverview);
  const { openSite, openingSiteId } = useOpenDockSite();

  const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | undefined>();
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (siteId?: Id<"sites">) => {
    setLoading(true);
    try {
      const result = await loadBotOverview({ siteId });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [loadBotOverview]);

  useEffect(() => {
    void refresh(selectedSiteId);
  }, [refresh, selectedSiteId]);

  const focusSite = data?.focusSite;
  const stats = data?.stats;
  const bot = data?.bot;
  const siteOptions = data?.siteOptions ?? [];

  const headerDescription = bot
    ? [
        bot.presence ? bot.presence : null,
        bot.online === true ? "Online" : bot.online === false ? "Offline" : null,
        focusSite ? formatSiteHost({ siteId: focusSite._id, slug: focusSite.slug }) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : focusSite
      ? formatSiteHost({ siteId: focusSite._id, slug: focusSite.slug })
      : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <DashboardPageHeader
        title={bot?.name ?? focusSite?.title ?? "Overview"}
        description={headerDescription || undefined}
        actions={
          siteOptions.length > 1 ? (
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="sr-only">Site</span>
              <select
                value={selectedSiteId ?? focusSite?._id ?? ""}
                onChange={(event) => {
                  const value = event.target.value as Id<"sites">;
                  setSelectedSiteId(value);
                }}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
              >
                {siteOptions.map((site: OverviewPayload["siteOptions"][number]) => (
                  <option key={site._id} value={site._id}>
                    {site.title}
                  </option>
                ))}
              </select>
            </label>
          ) : focusSite ? (
            <Link href="/dashboard/sites" className="text-xs text-zinc-500 hover:text-zinc-300">
              Manage sites
            </Link>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-8 px-6 py-8 sm:px-8">
        {loading && !data ? (
          <p className="text-xs text-zinc-600">Loading bot overview…</p>
        ) : null}

        {data?.error ? (
          <p className="text-xs text-amber-400/90">{data.error}</p>
        ) : null}

        {data?.missingScopes ? (
          <p className="text-xs text-zinc-500">
            Sign out and sign in with Meridian again to grant server and flow access.
          </p>
        ) : null}

        {data?.statsHints?.needsPublicStatus ? (
          <p className="text-xs text-zinc-500">
            Server count and uptime need Meridian guild access, public bot status, or a
            Dock home-stats API on the bot.
          </p>
        ) : null}

        {data?.statsHints?.needsGuildScope ? (
          <p className="text-xs text-zinc-500">
            Re-sign in with Meridian to load server count from your bot&apos;s guild list.
          </p>
        ) : null}

        {data?.statsHints?.needsFlowsScope ? (
          <p className="text-xs text-zinc-500">
            Re-sign in with Meridian to load command, event, and function counts.
          </p>
        ) : null}

        {!focusSite && !loading ? (
          <div className="max-w-md">
            <p className="text-sm text-zinc-400">
              Link a Meridian bot on the Sites page to see live bot stats here.
            </p>
            <Link href="/dashboard/sites" className="landing-btn-primary mt-5 inline-flex text-xs">
              Go to Sites
            </Link>
          </div>
        ) : null}

        {stats && focusSite ? (
          <>
            <section>
              <div className="dashboard-bot-stat-strip">
                <DashboardBotStat
                  label="Servers"
                  value={formatCompactCount(stats.servers)}
                />
                <DashboardBotStat
                  label="Members"
                  value={formatCompactCount(stats.members)}
                />
                <DashboardBotStat label="Uptime" value={formatUptimeMs(stats.uptimeMs)} />
                <DashboardBotStat label="Commands" value={String(stats.commands)} />
                <DashboardBotStat label="Events" value={String(stats.events)} />
                <DashboardBotStat label="Functions" value={String(stats.functions)} />
                <DashboardBotStat
                  label="Active cases"
                  value={String(stats.dockCasesActive)}
                />
              </div>
              <p className="mt-2 text-[11px] text-zinc-600">
                Bot stats from Meridian · Active cases on this Dock site
                {stats.dockCasesTotal > stats.dockCasesActive
                  ? ` (${stats.dockCasesTotal} total)`
                  : ""}
                {data.statsHints?.membersUnavailable &&
                stats.members == null
                  ? " · Member totals need Meridian home-stats or public status"
                  : ""}
              </p>
            </section>

            <section className="max-w-lg rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-medium text-zinc-100">{focusSite.title}</p>
                <SiteStatusChip status={focusSite.status} />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Staff dashboard for {bot?.name ?? focusSite.botName ?? "your bot"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={openingSiteId === focusSite._id}
                  onClick={() => void openSite(focusSite)}
                  className="landing-btn-primary text-xs disabled:cursor-wait disabled:opacity-60"
                >
                  {openingSiteId === focusSite._id ? "Opening…" : "Open site"}
                </button>
                {focusSite.hostKind === "custom_slug" ? (
                  <Link
                    href={`/dashboard/sites/${focusSite._id}/edit`}
                    className="landing-btn-secondary text-xs"
                  >
                    Edit dashboard
                  </Link>
                ) : (
                  <a
                    href={buildSiteEditUrl({
                      siteId: focusSite._id,
                      slug: focusSite.slug,
                    })}
                    className="landing-btn-secondary text-xs"
                  >
                    Edit dashboard
                  </a>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
