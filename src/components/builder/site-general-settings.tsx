"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { canHideDockBranding, normalizeOwnerPlan, type OwnerPlan } from "../../../convex/lib/siteLimits";
import { InspectorSwitch } from "@/components/builder/inspector-chrome";
import { FaviconPicker } from "@/components/builder/favicon-picker";
import { userFacingError } from "@/lib/user-facing-error";

export function SiteGeneralSettings({
  siteId,
  title,
  caseUrlPattern,
  plan,
  hideDockBranding,
  faviconUrl,
}: {
  siteId: Id<"sites">;
  title: string;
  caseUrlPattern: string;
  plan: OwnerPlan;
  hideDockBranding: boolean;
  faviconUrl: string | null;
}) {
  const updateSiteMeta = useMutation(api.sites.updateSiteMeta);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftCaseUrlPattern, setDraftCaseUrlPattern] = useState(caseUrlPattern);
  const [saving, setSaving] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [brandingTooltip, setBrandingTooltip] = useState<{ x: number; y: number } | null>(
    null,
  );
  const canRemoveBranding = canHideDockBranding(normalizeOwnerPlan(plan));

  useEffect(() => {
    if (saving) return;
    setDraftTitle(title);
    setDraftCaseUrlPattern(caseUrlPattern);
  }, [title, caseUrlPattern, saving]);

  const hasChanges =
    draftTitle.trim() !== title ||
    draftCaseUrlPattern.trim() !== caseUrlPattern;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSiteMeta({
        siteId,
        title: draftTitle,
        caseUrlPattern: draftCaseUrlPattern,
      });
      setSaved(true);
    } catch (cause) {
      setError(userFacingError(cause, "Could not save settings."));
    } finally {
      setSaving(false);
    }
  }

  async function handleHideBrandingChange(nextHide: boolean) {
    if (!canRemoveBranding && nextHide) return;
    setBrandingSaving(true);
    setError(null);
    try {
      await updateSiteMeta({ siteId, hideDockBranding: nextHide });
    } catch (cause) {
      setError(userFacingError(cause, "Could not update branding."));
    } finally {
      setBrandingSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-zinc-400">Title</span>
        <input
          id="site-title"
          value={draftTitle}
          onChange={(event) => {
            setDraftTitle(event.target.value);
            setSaved(false);
          }}
          className="site-builder-field"
        />
        <span className="text-[11px] text-zinc-500">
          Shown with each page title in the browser tab
        </span>
      </label>
      <FaviconPicker siteId={siteId} faviconUrl={faviconUrl} />
      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-zinc-400">Case URL</span>
        <input
          id="case-url-pattern"
          value={draftCaseUrlPattern}
          onChange={(event) => {
            setDraftCaseUrlPattern(event.target.value);
            setSaved(false);
          }}
          className="site-builder-field"
          spellCheck={false}
          placeholder="{case_slug}"
        />
      </label>
      <div className="flex min-h-7 items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-zinc-200">Hide Dock branding</p>
        </div>
        <span
          className="relative ml-auto inline-flex"
          onMouseEnter={(event) => {
            if (canRemoveBranding) return;
            const rect = event.currentTarget.getBoundingClientRect();
            setBrandingTooltip({
              x: Math.min(rect.right, window.innerWidth - 8),
              y: rect.top,
            });
          }}
          onMouseLeave={() => setBrandingTooltip(null)}
        >
          <InspectorSwitch
            checked={hideDockBranding}
            disabled={!canRemoveBranding || brandingSaving}
            label="Hide Dock branding"
            onChange={(next) => void handleHideBrandingChange(next)}
          />
        </span>
      </div>
      {brandingTooltip
        ? createPortal(
            <span
              role="tooltip"
              className="pointer-events-none fixed z-[80] -translate-x-full -translate-y-full whitespace-nowrap rounded-lg border border-white/10 bg-zinc-950 px-2 py-1 text-[11px] font-medium text-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              style={{ left: brandingTooltip.x, top: brandingTooltip.y - 8 }}
            >
              Hobby plan or higher
            </span>,
            document.body,
          )
        : null}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={!hasChanges || saving}
          onClick={() => void handleSave()}
          className="rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {error ? <p className="text-[11px] text-red-400">{error}</p> : null}
        {saved && !hasChanges ? (
          <p className="text-[11px] text-zinc-500">Saved</p>
        ) : null}
      </div>
    </div>
  );
}
