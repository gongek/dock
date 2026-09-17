"use client";

import { useQuery, useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SiteBuilder } from "@/components/builder/site-builder";
import { SiteBuilderAccessError } from "@/components/builder/site-builder-access-error";
import { SiteBuilderLoadingScreen } from "@/components/builder/site-builder-loading-screen";
import { useFakeLoadingDuration } from "@/components/builder/use-min-loading-duration";

const REVEAL_FADE_MS = 400;

export function SiteBuilderLoader({ siteId }: { siteId: Id<"sites"> }) {
  const bootstrap = useQuery(api.sites.getSiteEditorBootstrap, { siteId });
  const ensureProtectedPage = useMutation(api.sitePages.ensureProtectedPage);
  const [builderReady, setBuilderReady] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(true);
  const fakeLoadingDone = useFakeLoadingDuration();
  const handleBuilderReady = useCallback(() => setBuilderReady(true), []);

  const canMountBuilder =
    bootstrap !== undefined && bootstrap.ok && bootstrap.pages.length > 0;
  const contentReady = canMountBuilder && fakeLoadingDone && builderReady;
  const [readyToReveal, setReadyToReveal] = useState(false);
  const handleLoadingComplete = useCallback(() => setReadyToReveal(true), []);

  useEffect(() => {
    if (!bootstrap?.ok) return;
    void ensureProtectedPage({ siteId });
  }, [bootstrap?.ok, ensureProtectedPage, siteId]);

  useEffect(() => {
    if (!readyToReveal) return;
    const timeoutId = window.setTimeout(() => setOverlayMounted(false), REVEAL_FADE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [readyToReveal]);

  if (bootstrap !== undefined && !bootstrap.ok) {
    return <SiteBuilderAccessError error={bootstrap.error} />;
  }

  if (bootstrap !== undefined && bootstrap.ok && bootstrap.pages.length === 0) {
    return <p className="p-6 text-sm text-zinc-500">Site not found.</p>;
  }

  return (
    <>
      {canMountBuilder ? (
        <div
          className={`transition-opacity ease-out ${readyToReveal ? "opacity-100" : "pointer-events-none opacity-0"}`}
          style={{ transitionDuration: `${REVEAL_FADE_MS}ms` }}
          aria-hidden={!readyToReveal}
        >
          <SiteBuilder
            siteId={siteId}
            site={bootstrap.site}
            siteTitle={bootstrap.site.title}
            siteSlug={bootstrap.site.slug}
            hostKind={bootstrap.site.hostKind}
            meridianBotId={bootstrap.site.meridianBotId}
            botName={bootstrap.site.bot?.name}
            linkedGuildId={bootstrap.site.linkedGuildId}
            caseUrlPattern={bootstrap.site.caseUrlPattern}
            navbarStyle={bootstrap.site.navbarStyle}
            navbarText={bootstrap.site.navbarText}
            navbarMenu={bootstrap.site.navbarMenu}
            navbarAlign={bootstrap.site.navbarAlign}
            navbarBrandSide={bootstrap.site.navbarBrandSide}
            navbarLinkStyle={bootstrap.site.navbarLinkStyle}
            navbarShowBrand={bootstrap.site.navbarShowBrand}
            showDockBranding={bootstrap.site.showDockBranding}
            pages={bootstrap.pages}
            initialPageId={bootstrap.pages[0]!._id}
            onReady={handleBuilderReady}
          />
        </div>
      ) : null}
      {!readyToReveal || overlayMounted ? (
        <SiteBuilderLoadingScreen
          visible={!readyToReveal}
          fadeMs={REVEAL_FADE_MS}
          completionRequested={contentReady}
          onComplete={handleLoadingComplete}
        />
      ) : null}
    </>
  );
}
