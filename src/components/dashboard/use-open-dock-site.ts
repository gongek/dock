"use client";

import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { buildSiteOrigin } from "@/lib/site-host";

export type OpenDockSiteInput = {
  _id: string;
  slug: string;
  hostKind: "bot_subdomain" | "custom_slug";
};

export function useOpenDockSite() {
  const beginSiteDiscordAuth = useMutation(
    api.siteDiscordAuthMutations.beginSiteDiscordAuth,
  );
  const [openingSiteId, setOpeningSiteId] = useState<string | null>(null);

  const openSite = useCallback(
    async (site: OpenDockSiteInput) => {
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

  return { openSite, openingSiteId };
}
