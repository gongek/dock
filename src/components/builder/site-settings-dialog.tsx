"use client";

import { useGSAP } from "@gsap/react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SiteDomainsSettings } from "@/components/builder/site-domains-settings";
import { SiteGeneralSettings } from "@/components/builder/site-general-settings";
import { StaffAccessSettings } from "@/components/builder/staff-access-settings";
import {
  DEFAULT_SITE_ACCESS_SETTINGS,
  type SiteAccessSettings,
} from "@/lib/site-access";

gsap.registerPlugin(useGSAP);

type SettingsSection = "general" | "domains" | "staff-access";

const SECTIONS: Array<{ id: SettingsSection; label: string; icon: string }> = [
  { id: "general", label: "General", icon: "bx-cog" },
  { id: "domains", label: "Domains", icon: "bx-globe" },
  { id: "staff-access", label: "Staff access", icon: "bx-shield" },
];

export type SiteSettingsSite = FunctionReturnType<typeof api.sites.getSite>;

export function SiteSettingsDialog({
  onClose,
  siteId,
  preloadedSite,
  hidden = false,
}: {
  onClose: () => void;
  siteId: Id<"sites">;
  preloadedSite?: SiteSettingsSite;
  hidden?: boolean;
}) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const siteFromQuery = useQuery(api.sites.getSite, { siteId });
  const site = siteFromQuery ?? preloadedSite;
  const rootRef = useRef<HTMLDivElement>(null);
  const showStaffAccess = site?.hostKind === "bot_subdomain";
  const visibleSections = SECTIONS.filter(
    (section) => section.id !== "staff-access" || showStaffAccess,
  );
  const currentSection =
    visibleSections.find((section) => section.id === activeSection) ??
    visibleSections[0]!;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!visibleSections.some((section) => section.id === activeSection)) {
      setActiveSection("general");
    }
  }, [activeSection, visibleSections]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          allowMotion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);
          if (reduceMotion) {
            gsap.set(root, { autoAlpha: 1 });
            return;
          }
          gsap.fromTo(
            root,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.2, ease: "power2.out" },
          );
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const accessSettings = (site?.accessSettings ??
    DEFAULT_SITE_ACCESS_SETTINGS) as SiteAccessSettings;

  return (
    <div
      ref={rootRef}
      className={`site-builder flex h-full min-h-0 min-w-0 flex-1 opacity-0 ${hidden ? "hidden" : ""}`}
      aria-hidden={hidden}
    >
      <aside className="site-builder-surface flex w-60 shrink-0 flex-col border-r border-white/[0.07] py-4">
        <p className="mb-2 px-4 text-[11px] font-medium tracking-wide text-zinc-500">
          Site settings
        </p>
        <nav className="flex flex-col gap-0.5 px-2">
          {visibleSections.map((section) => {
            const active = currentSection.id === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                  active
                    ? "bg-white/[0.08] text-zinc-100"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                <i className={`bx ${section.icon} text-base text-zinc-400`} aria-hidden />
                {section.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="site-builder-scroll min-h-0 min-w-0 flex-1 overflow-y-auto px-8 py-8 sm:px-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-6 text-xl font-medium text-zinc-100">{currentSection.label}</h1>
          {site === undefined ? (
            <p className="text-[11px] text-zinc-500">Loading…</p>
          ) : site === null ? (
            <p className="text-[11px] text-red-400">Site not found.</p>
          ) : (
            <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
              <div
                className={
                  currentSection.id === "general"
                    ? undefined
                    : "invisible pointer-events-none"
                }
                aria-hidden={currentSection.id !== "general"}
              >
                <SiteGeneralSettings
                  siteId={siteId}
                  title={site.title}
                  caseUrlPattern={site.caseUrlPattern}
                  plan={site.plan}
                  hideDockBranding={Boolean(site.hideDockBranding)}
                  faviconUrl={site.faviconUrl}
                />
              </div>
              <div
                className={
                  currentSection.id === "domains"
                    ? undefined
                    : "invisible pointer-events-none"
                }
                aria-hidden={currentSection.id !== "domains"}
              >
                <SiteDomainsSettings
                  siteId={siteId}
                  slug={site.slug}
                  hostKind={site.hostKind}
                />
              </div>
              {showStaffAccess ? (
                <div
                  className={
                    currentSection.id === "staff-access"
                      ? undefined
                      : "invisible pointer-events-none"
                  }
                  aria-hidden={currentSection.id !== "staff-access"}
                >
                  <StaffAccessSettings
                    siteId={siteId}
                    settings={accessSettings}
                    canEdit={showStaffAccess}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
