"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { OnboardingSitesShell } from "@/components/onboarding/onboarding-sites-shell";
import { buildOnboardingPath } from "@/lib/onboarding-host";
import { readMeridianBotHandoffId } from "@/lib/meridian-bot-select";
import {
  buildSiteEditUrl,
  formatSiteHost,
  formatSiteHostPreview,
} from "@/lib/site-host";
import { userFacingError } from "@/lib/user-facing-error";

type SelectedBot = {
  meridianBotId: string;
  label: string;
  name: string;
  linkedGuildId?: string;
};

export function OnboardingSitesConfigPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const botId = readMeridianBotHandoffId(searchParams);
  const sitesData = useQuery(api.sites.listMySites);
  const getBotLinkingState = useAction(api.meridian.onboarding.getBotLinkingState);
  const createBotSite = useMutation(api.sites.createBotSite);

  const [selectedBot, setSelectedBot] = useState<SelectedBot | null>(null);
  const [siteTitle, setSiteTitle] = useState("");
  const [busy, setBusy] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSite, setCreatedSite] = useState<{
    siteId: string;
    slug: string;
  } | null>(null);

  const loadBot = useCallback(async () => {
    if (!botId) {
      setError("No bot selected. Choose a bot on Meridian first.");
      setBusy(false);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const state = await getBotLinkingState({});
      const bot = state.bots.find((entry) => entry.meridianBotId === botId);
      if (!bot) {
        setError(
          "That bot is not available on your Meridian account. Choose another bot on Meridian.",
        );
        setSelectedBot(null);
        return;
      }
      setSelectedBot(bot);
      setSiteTitle(bot.name);
    } catch (cause) {
      setError(userFacingError(cause, "Could not load bot details."));
    } finally {
      setBusy(false);
    }
  }, [botId, getBotLinkingState]);

  useEffect(() => {
    void loadBot();
  }, [loadBot]);

  useEffect(() => {
    if (!botId) {
      router.replace(buildOnboardingPath("/sites/link"));
    }
  }, [botId, router]);

  async function handleCreateSite() {
    if (!selectedBot) return;

    setCreating(true);
    setError(null);
    try {
      const siteId = await createBotSite({
        meridianBotId: selectedBot.meridianBotId,
        botLabel: selectedBot.label,
        title: siteTitle.trim() || selectedBot.name,
        linkedGuildId: selectedBot.linkedGuildId,
      });
      setCreatedSite({ siteId, slug: selectedBot.meridianBotId });
    } catch (cause) {
      setError(userFacingError(cause, "Could not create site."));
    } finally {
      setCreating(false);
    }
  }

  if (createdSite) {
    return (
      <OnboardingSitesShell activeStep="config" title="Dashboard created">
        <p className="text-sm leading-6 text-zinc-400">
          Your site is ready at{" "}
          {formatSiteHost({
            siteId: createdSite.siteId,
            slug: createdSite.slug,
          })}
          .
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a
            href={buildSiteEditUrl({
              siteId: createdSite.siteId,
              slug: createdSite.slug,
            })}
            className="landing-btn-primary text-center text-sm"
          >
            Open editor
          </a>
          <Link
            href="/dashboard/sites"
            className="landing-btn-secondary text-center text-sm"
          >
            Go to sites
          </Link>
        </div>
      </OnboardingSitesShell>
    );
  }

  const showCustomSlugHint =
    sitesData !== undefined && sitesData.plan !== "free";

  return (
    <OnboardingSitesShell activeStep="config" title="Configure your site">
      {busy ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : selectedBot ? (
        <>
          <p className="text-sm leading-6 text-zinc-400">
            Your dashboard will be available at{" "}
            <span className="text-zinc-200">
              {formatSiteHostPreview(selectedBot.meridianBotId)}
            </span>
            .
          </p>
          <label className="mt-5 block text-xs text-zinc-500">
            Site title
            <input
              value={siteTitle}
              onChange={(event) => setSiteTitle(event.target.value)}
              className="mt-2 w-full rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-100"
            />
          </label>
          <p className="mt-3 text-xs text-zinc-600">Bot: {selectedBot.name}</p>
          {showCustomSlugHint ? (
            <p className="mt-3 text-xs text-zinc-600">
              Bot sites use your Meridian bot id as the subdomain. Custom slugs
              are available when you add a separate custom site from the
              dashboard.
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={creating}
              onClick={() => router.push(buildOnboardingPath("/sites/link"))}
              className="landing-btn-secondary text-sm"
            >
              Back
            </button>
            <button
              type="button"
              disabled={creating || !siteTitle.trim()}
              onClick={() => void handleCreateSite()}
              className="landing-btn-primary flex-1 text-sm disabled:cursor-wait disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create dashboard"}
            </button>
          </div>
        </>
      ) : null}

      {error ? (
        <p className="mt-4 text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {error && !selectedBot ? (
        <button
          type="button"
          onClick={() => router.push(buildOnboardingPath("/sites/link"))}
          className="landing-btn-primary mt-4 text-sm"
        >
          Back to link bot
        </button>
      ) : null}
    </OnboardingSitesShell>
  );
}
