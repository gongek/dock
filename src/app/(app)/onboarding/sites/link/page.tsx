import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingSitesLinkPage } from "@/components/onboarding/onboarding-sites-link-page";

export const metadata: Metadata = {
  title: "Connect Meridian | Create a site | Dock",
};

export default function OnboardingSitesLinkRoute() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-zinc-500">Loading…</p>}>
      <OnboardingSitesLinkPage />
    </Suspense>
  );
}
