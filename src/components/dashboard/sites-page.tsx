"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardSiteListItem } from "@/components/dashboard/dashboard-site-list-item";
import { SitesEmptyState } from "@/components/dashboard/sites-empty-state";
import { useOpenDockSite } from "@/components/dashboard/use-open-dock-site";
import { formatSitesPageDescription } from "@/lib/dashboard-sites-summary";
import { buildOnboardingUrl } from "@/lib/onboarding-host";
import { userFacingError } from "@/lib/user-facing-error";

const CREATE_BOT_SITE_URL = buildOnboardingUrl("/sites/link");

export function SitesDashboardPage() {
  const data = useQuery(api.sites.listMySites);
  const createCustomSite = useMutation(api.sites.createCustomSite);
  const { openSite, openingSiteId } = useOpenDockSite();

  const [customSlug, setCustomSlug] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const atSiteLimit =
    data?.maxSites !== null &&
    data?.maxSites !== undefined &&
    data.sites.length >= data.maxSites;
  const canCreateCustom = data !== undefined && data.plan !== "free";

  async function handleCreateCustomSite() {
    setBusy(true);
    setError(null);
    try {
      await createCustomSite({ slug: customSlug, title: customTitle || customSlug });
      setCustomSlug("");
      setCustomTitle("");
      setCustomFormOpen(false);
    } catch (cause) {
      setError(userFacingError(cause, "Could not create site."));
    } finally {
      setBusy(false);
    }
  }

  const hasSites = (data?.sites.length ?? 0) > 0;

  return (
    <div className="flex flex-1 flex-col">
      <DashboardPageHeader
        title="Sites"
        description={data ? formatSitesPageDescription(data) : undefined}
        actions={
          hasSites ? (
            <>
              {canCreateCustom ? (
                <button
                  type="button"
                  disabled={busy || atSiteLimit}
                  onClick={() => setCustomFormOpen((open) => !open)}
                  className="landing-btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {customFormOpen ? "Cancel" : "Add custom site"}
                </button>
              ) : null}
              <Link
                href={CREATE_BOT_SITE_URL}
                className="landing-btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-60"
                aria-disabled={busy || atSiteLimit}
                tabIndex={busy || atSiteLimit ? -1 : undefined}
                onClick={(event) => {
                  if (busy || atSiteLimit) event.preventDefault();
                }}
              >
                Create bot site
              </Link>
            </>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-8 px-6 py-8 sm:px-8">
        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        {atSiteLimit ? (
          <p className="text-xs text-zinc-500">
            You&apos;ve used all site slots on your plan.{" "}
            <Link href="/premium" className="text-sky-400/90 hover:text-sky-300">
              Upgrade for more
            </Link>
          </p>
        ) : null}

        {customFormOpen && canCreateCustom ? (
          <div className="landing-card landing-card--static p-5 sm:p-6">
            <p className="text-sm font-medium text-zinc-200">New custom slug site</p>
            <p className="mt-1 text-xs text-zinc-500">
              Pick a slug for your public URL. You can change the title anytime in the editor.
            </p>
            <div className="mt-4 flex max-w-md flex-col gap-3">
              <input
                value={customSlug}
                onChange={(event) => setCustomSlug(event.target.value)}
                placeholder="mysite"
                className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm"
              />
              <input
                value={customTitle}
                onChange={(event) => setCustomTitle(event.target.value)}
                placeholder="Site title"
                className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy || !customSlug.trim()}
                onClick={() => void handleCreateCustomSite()}
                className="landing-btn-primary w-fit text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create site
              </button>
            </div>
          </div>
        ) : null}

        {data === undefined ? (
          <p className="text-xs text-zinc-600">Loading sites…</p>
        ) : hasSites ? (
          <div className="dashboard-site-list">
            {data.sites.map((site) => (
              <DashboardSiteListItem
                key={site._id}
                site={site}
                onOpen={() => void openSite(site)}
                opening={openingSiteId === site._id}
              />
            ))}
          </div>
        ) : (
          <SitesEmptyState createBotSiteUrl={CREATE_BOT_SITE_URL} busy={busy} atSiteLimit={atSiteLimit} />
        )}
      </div>
    </div>
  );
}
