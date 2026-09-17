"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { InspectorRow, InspectorSwitch } from "@/components/builder/inspector-chrome";
import {
  DEFAULT_SITE_PROTECTED_PAGE,
  resolveSiteProtectedPage,
} from "@/lib/site-protected-page";
import { userFacingError } from "@/lib/user-facing-error";

export function ProtectedPageSettings({ siteId }: { siteId: Id<"sites"> }) {
  const site = useQuery(api.sites.getSite, { siteId });
  const updateProtectedPage = useMutation(api.sites.updateSiteProtectedPage);
  const resolved = resolveSiteProtectedPage(site?.protectedPage);
  const [draft, setDraft] = useState(resolved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saving || site === undefined) return;
    setDraft(resolveSiteProtectedPage(site?.protectedPage));
  }, [site, saving]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(resolved);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProtectedPage({
        siteId,
        protectedPage: draft,
      });
      setSaved(true);
    } catch (cause) {
      setError(userFacingError(cause, "Could not save protected page settings."));
    } finally {
      setSaving(false);
    }
  }

  if (site === undefined) {
    return <p className="text-[11px] text-zinc-500">Loading…</p>;
  }

  if (site === null) {
    return <p className="text-[11px] text-red-400">Site not found.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <InspectorRow label="Title">
        <input
          aria-label="Protected page title"
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          placeholder={DEFAULT_SITE_PROTECTED_PAGE.title}
          className="site-builder-field site-builder-field-compact min-w-0 flex-1"
        />
      </InspectorRow>
      <InspectorRow label="Message">
        <textarea
          aria-label="Protected page message"
          value={draft.message}
          onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))}
          placeholder={DEFAULT_SITE_PROTECTED_PAGE.message}
          rows={4}
          className="site-builder-field min-h-[5.5rem] min-w-0 flex-1 resize-y"
        />
      </InspectorRow>
      <InspectorRow label="Home btn">
        <input
          aria-label="Home button label"
          value={draft.homeButtonLabel}
          onChange={(event) =>
            setDraft((current) => ({ ...current, homeButtonLabel: event.target.value }))
          }
          placeholder={DEFAULT_SITE_PROTECTED_PAGE.homeButtonLabel}
          className="site-builder-field site-builder-field-compact min-w-0 flex-1"
        />
      </InspectorRow>
      <InspectorRow label="Retry btn">
        <input
          aria-label="Retry button label"
          value={draft.retryButtonLabel}
          onChange={(event) =>
            setDraft((current) => ({ ...current, retryButtonLabel: event.target.value }))
          }
          placeholder={DEFAULT_SITE_PROTECTED_PAGE.retryButtonLabel}
          className="site-builder-field site-builder-field-compact min-w-0 flex-1"
        />
      </InspectorRow>
      <InspectorRow label="Show home">
        <InspectorSwitch
          label="Show home button"
          checked={draft.showHomeButton}
          onChange={(value) => setDraft((current) => ({ ...current, showHomeButton: value }))}
        />
      </InspectorRow>
      <InspectorRow label="Show retry">
        <InspectorSwitch
          label="Show retry button"
          checked={draft.showRetryButton}
          onChange={(value) => setDraft((current) => ({ ...current, showRetryButton: value }))}
        />
      </InspectorRow>
      <div className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-3">
        <p className="text-[11px] font-medium text-zinc-400">Preview</p>
        <p className="mt-2 text-sm font-medium text-zinc-100">{draft.title || resolved.title}</p>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          {draft.message || resolved.message}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasChanges || saving}
          onClick={() => void handleSave()}
          className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-zinc-200 hover:border-white/20 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved ? <span className="text-[11px] text-emerald-400">Saved</span> : null}
      </div>
      {error ? <p className="text-[11px] text-red-400">{error}</p> : null}
    </div>
  );
}
