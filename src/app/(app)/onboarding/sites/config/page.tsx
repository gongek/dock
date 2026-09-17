import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingSitesConfigPage } from "@/components/onboarding/onboarding-sites-config-page";

export const metadata: Metadata = {
  title: "Configure site | Dock",
};

export default function OnboardingSitesConfigRoute() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-zinc-500">Loading…</p>}>
      <OnboardingSitesConfigPage />
    </Suspense>
  );
}
