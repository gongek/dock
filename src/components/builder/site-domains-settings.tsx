"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DOCK_APEX } from "@/lib/site-host";
import { userFacingError } from "@/lib/user-facing-error";

type VerificationRecord = {
  type: string;
  name: string;
  value: string;
};

function parseVerificationRecords(raw: string | undefined): VerificationRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as VerificationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function statusLabel(status: "pending" | "active" | "failed") {
  switch (status) {
    case "active":
      return "Active";
    case "failed":
      return "Failed";
    default:
      return "Pending DNS";
  }
}

function statusClassName(status: "pending" | "active" | "failed") {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-300";
    case "failed":
      return "bg-red-500/10 text-red-300";
    default:
      return "bg-amber-500/10 text-amber-300";
  }
}

export function SiteDomainsSettings({
  siteId,
  slug,
  hostKind,
}: {
  siteId: Id<"sites">;
  slug: string;
  hostKind: "bot_subdomain" | "custom_slug";
}) {
  const updateSiteMeta = useMutation(api.sites.updateSiteMeta);
  const domainState = useQuery(api.siteCustomDomains.listForSite, { siteId });
  const addDomain = useAction(api.siteCustomDomainsActions.addDomain);
  const verifyDomain = useAction(api.siteCustomDomainsActions.verifyDomain);
  const removeDomain = useAction(api.siteCustomDomainsActions.removeDomain);

  const [draftSlug, setDraftSlug] = useState(slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [draftHostname, setDraftHostname] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [addingDomain, setAddingDomain] = useState(false);
  const [busyDomainId, setBusyDomainId] = useState<Id<"siteCustomDomains"> | null>(null);

  useEffect(() => {
    if (saving) return;
    setDraftSlug(slug);
  }, [slug, saving]);

  const slugLabel = hostKind === "bot_subdomain" ? "Subdomain" : "Slug";
  const normalizedDraftSlug = draftSlug.trim().toLowerCase();
  const hasChanges = normalizedDraftSlug !== slug;

  const canUseCustomDomain = domainState?.canUseCustomDomain ?? false;
  const customDomainsConfigured = domainState?.customDomainsConfigured ?? false;
  const canAddCustomDomain = domainState?.canAddCustomDomain ?? false;
  const maxCustomDomains = domainState?.maxCustomDomains ?? 0;
  const domains = domainState?.domains ?? [];
  const remainingSlots = Math.max(0, maxCustomDomains - domains.length);
  const canAddMore = canAddCustomDomain && remainingSlots > 0;

  const pendingDomains = useMemo(
    () => domains.filter((domain) => domain.status !== "active"),
    [domains],
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSiteMeta({
        siteId,
        slug: draftSlug,
      });
      setSaved(true);
    } catch (cause) {
      setError(userFacingError(cause, "Could not save domain settings."));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDomain() {
    setAddingDomain(true);
    setCustomError(null);
    try {
      await addDomain({
        siteId,
        hostname: draftHostname,
      });
      setDraftHostname("");
    } catch (cause) {
      setCustomError(userFacingError(cause, "Could not connect domain."));
    } finally {
      setAddingDomain(false);
    }
  }

  async function handleVerifyDomain(domainId: Id<"siteCustomDomains">) {
    setBusyDomainId(domainId);
    setCustomError(null);
    try {
      await verifyDomain({ domainId });
    } catch (cause) {
      setCustomError(userFacingError(cause, "Could not verify domain."));
    } finally {
      setBusyDomainId(null);
    }
  }

  async function handleRemoveDomain(domainId: Id<"siteCustomDomains">, hostname: string) {
    const confirmed = window.confirm(`Remove ${hostname} from this site?`);
    if (!confirmed) return;

    setBusyDomainId(domainId);
    setCustomError(null);
    try {
      await removeDomain({ domainId });
    } catch (cause) {
      setCustomError(userFacingError(cause, "Could not remove domain."));
    } finally {
      setBusyDomainId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-[13px] font-medium text-zinc-200">Default domain</h2>
          <p className="mt-1 text-[11px] text-zinc-500">
            Your site is always available on this Dock address.
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-zinc-400">{slugLabel}</span>
          {hostKind === "bot_subdomain" ? (
            <div className="flex w-fit max-w-full items-center gap-2">
              <input
                id="site-domain-slug"
                value={draftSlug}
                onChange={(event) => {
                  setDraftSlug(event.target.value);
                  setSaved(false);
                }}
                className="site-builder-field w-36 sm:w-40"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <span className="shrink-0 text-xs leading-5 text-zinc-200">.{DOCK_APEX}</span>
            </div>
          ) : (
            <input
              id="site-domain-slug"
              value={draftSlug}
              onChange={(event) => {
                setDraftSlug(event.target.value);
                setSaved(false);
              }}
              className="site-builder-field"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          )}
        </label>
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
      </section>

      <section className="flex flex-col gap-3 border-t border-white/[0.07] pt-6">
        <div>
          <h2 className="text-[13px] font-medium text-zinc-200">Custom domains</h2>
          <p className="mt-1 text-[11px] text-zinc-500">
            Connect your own domain to this site.
          </p>
        </div>

        {!canUseCustomDomain ? (
          <div className="rounded-lg border border-dashed border-white/[0.08] px-4 py-5">
            <p className="text-[13px] text-zinc-300">Custom domains are available on Pro and above.</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Upgrade your plan to connect a domain like www.example.com.
            </p>
          </div>
        ) : !customDomainsConfigured ? (
          <div className="rounded-lg border border-dashed border-white/[0.08] px-4 py-5">
            <p className="text-[13px] text-zinc-300">
              Custom domains are not available right now.
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Please try again later.
            </p>
          </div>
        ) : (
          <>
            {canAddMore ? (
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-zinc-400">Domain</span>
                  <input
                    value={draftHostname}
                    onChange={(event) => setDraftHostname(event.target.value)}
                    placeholder="www.example.com"
                    className="site-builder-field"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!draftHostname.trim() || addingDomain}
                    onClick={() => void handleAddDomain()}
                    className="rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addingDomain ? "Connecting…" : "Connect domain"}
                  </button>
                  <p className="text-[11px] text-zinc-500">
                    {remainingSlots} slot{remainingSlots === 1 ? "" : "s"} remaining
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500">
                You have reached the custom domain limit for your plan.
              </p>
            )}

            {customError ? <p className="text-[11px] text-red-400">{customError}</p> : null}

            {domains.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.08] px-4 py-6 text-center">
                <p className="text-[13px] text-zinc-400">No custom domains connected</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {domains.map((domain) => {
                  const records = parseVerificationRecords(domain.verificationJson);
                  const isBusy = busyDomainId === domain._id;

                  return (
                    <div
                      key={domain._id}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-zinc-100">
                            {domain.hostname}
                          </p>
                          {domain.lastError ? (
                            <p className="mt-1 text-[11px] text-red-400">{domain.lastError}</p>
                          ) : null}
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClassName(domain.status)}`}
                        >
                          {statusLabel(domain.status)}
                        </span>
                      </div>

                      {records.length > 0 && domain.status !== "active" ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] text-zinc-500">
                            Add these DNS records at your registrar, then check status.
                          </p>
                          {records.map((record) => (
                            <div
                              key={`${record.type}:${record.name}:${record.value}`}
                              className="rounded-md border border-white/[0.06] bg-black/20 px-3 py-2 text-[11px]"
                            >
                              <p className="font-medium text-zinc-300">{record.type}</p>
                              <p className="mt-1 break-all text-zinc-400">
                                <span className="text-zinc-500">Name:</span> {record.name}
                              </p>
                              <p className="mt-1 break-all text-zinc-400">
                                <span className="text-zinc-500">Value:</span> {record.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {domain.status !== "active" ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleVerifyDomain(domain._id)}
                            className="rounded-full border border-white/[0.1] px-3 py-1 text-[11px] text-zinc-200 transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBusy ? "Checking…" : "Check status"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleRemoveDomain(domain._id, domain.hostname)}
                          className="rounded-full border border-red-500/20 px-3 py-1 text-[11px] text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pendingDomains.length > 0 ? (
              <p className="text-[11px] text-zinc-500">
                DNS changes can take a few minutes, but may take up to 24 hours to propagate.
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
