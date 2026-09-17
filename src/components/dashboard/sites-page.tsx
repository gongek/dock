"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CreateDashboardOnboarding } from "@/components/dashboard/create-dashboard-onboarding";
import { SitesEmptyState } from "@/components/dashboard/sites-empty-state";
import {
  buildSiteEditUrl,
  buildSiteOrigin,
  formatSiteHost,
} from "@/lib/site-host";
import { userFacingError } from "@/lib/user-facing-error";

export function SitesDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const data = useQuery(api.sites.listMySites);
  const createCustomSite = useMutation(api.sites.createCustomSite);
  const beginSiteDiscordAuth = useMutation(
    api.siteDiscordAuthMutations.beginSiteDiscordAuth,
  );

  const [customSlug, setCustomSlug] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resumeOnboarding = searchParams.get("onboarding") === "1";
  const [onboardingOpen, setOnboardingOpen] = useState(resumeOnboarding);
  const [onboardingResume, setOnboardingResume] = useState(resumeOnboarding);
  const [onboardingSession, setOnboardingSession] = useState(
    resumeOnboarding ? 1 : 0,
  );
  const [openingSiteId, setOpeningSiteId] = useState<string | null>(null);

  const openSite = useCallback(
    async (site: NonNullable<typeof data>["sites"][number]) => {
      const returnTo = buildSiteOrigin({
        siteId: site._id,
        slug: site.slug,
      });
      if (site.hostKind === "bot_subdomain") {
        setOpeningSiteId(site._id);
        try {
          const authorizeUrl = await beginSiteDiscordAuth({
            siteSlug: site.slug,
            returnTo,
            origin: window.location.origin,
          });
          window.open(authorizeUrl, "_blank", "noopener,noreferrer");
        } catch {
          window.open(returnTo, "_blank", "noopener,noreferrer");
        } finally {
          setOpeningSiteId(null);
        }
        return;
      }
      window.open(returnTo, "_blank", "noopener,noreferrer");
    },
    [beginSiteDiscordAuth],
  );

  const openOnboarding = useCallback((resume = false) => {
    setOnboardingResume(resume);
    setOnboardingSession((current) => current + 1);
    setOnboardingOpen(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    setOnboardingOpen(false);
    setOnboardingResume(false);
  }, []);

  useEffect(() => {
    if (!resumeOnboarding) return;
    router.replace("/dashboard/sites");
  }, [resumeOnboarding, router]);

  async function handleCreateCustomSite() {
    setBusy(true);
    setError(null);
    try {
      await createCustomSite({ slug: customSlug, title: customTitle || customSlug });
      setCustomSlug("");
      setCustomTitle("");
    } catch (cause) {
      setError(userFacingError(cause, "Could not create site."));
    } finally {
      setBusy(false);
    }
  }

  const hasSites = (data?.sites.length ?? 0) > 0;

  return (
    <div className="flex flex-1 flex-col">
      <CreateDashboardOnboarding
        open={onboardingOpen}
        resume={onboardingResume}
        sessionId={onboardingSession}
        onClose={closeOnboarding}
      />

      <header className="border-b border-zinc-800/80 px-8 py-6">
        <h1 className="text-lg font-medium tracking-wide text-zinc-100">Sites</h1>
        {data ? (
          <p className="mt-1 text-xs text-zinc-500">
            Plan: {data.plan}.{" "}
            {data.maxSites === null
              ? "Unlimited sites."
              : `${data.sites.length}/${data.maxSites} sites used.`}
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-600">Loading plan…</p>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-8 px-8 py-8">
        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        {hasSites ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm font-medium text-zinc-200">Free bot site</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Creates a staff panel for your bot, with Discord sign-in.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => openOnboarding()}
                className="mt-4 rounded-full border border-zinc-700 px-5 py-2.5 text-sm transition-colors hover:border-zinc-500 disabled:cursor-wait disabled:opacity-60"
              >
                Create bot site
              </button>
            </div>

            {data && data.plan !== "free" ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-sm font-medium text-zinc-200">Custom slug site</p>
                <div className="mt-4 flex flex-col gap-3">
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
                    disabled={busy}
                    onClick={() => void handleCreateCustomSite()}
                    className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm transition-colors hover:border-zinc-500 disabled:cursor-wait disabled:opacity-60"
                  >
                    Create custom site
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {data === undefined ? (
          <p className="text-xs text-zinc-600">Loading sites…</p>
        ) : hasSites ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950">
            <div className="border-b border-zinc-800 px-5 py-3 text-sm text-zinc-300">
              Your sites
            </div>
            <div className="divide-y divide-zinc-800">
              {data.sites.map((site: (typeof data.sites)[number]) => (
                <div
                  key={site._id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="text-sm text-zinc-200">{site.title}</p>
                    <p className="text-xs text-zinc-500">
                      {formatSiteHost({ siteId: site._id, slug: site.slug })} ·{" "}
                      {site.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void openSite(site)}
                      disabled={openingSiteId === site._id}
                      className="text-xs text-zinc-400 hover:text-zinc-200 disabled:cursor-wait disabled:opacity-60"
                    >
                      {openingSiteId === site._id ? "Opening…" : "Open"}
                    </button>
                    {site.hostKind === "custom_slug" ? (
                      <Link
                        href={`/dashboard/sites/${site._id}/edit`}
                        className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs hover:border-zinc-500"
                      >
                        Edit
                      </Link>
                    ) : (
                      <a
                        href={buildSiteEditUrl({
                          siteId: site._id,
                          slug: site.slug,
                        })}
                        className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs hover:border-zinc-500"
                      >
                        Edit
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <SitesEmptyState
            onOpenOnboarding={() => openOnboarding()}
            busy={busy}
          />
        )}
      </div>
    </div>
  );
}
