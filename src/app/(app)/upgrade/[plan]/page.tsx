import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveMeridianUpgradeUrl } from "@/lib/meridian-upgrade";

export const metadata: Metadata = {
  title: "Upgrade | Dock",
};

export default async function UpgradePage({
  params,
}: {
  params: Promise<{ plan: string }>;
}) {
  const { plan } = await params;
  const meridianUrl = resolveMeridianUpgradeUrl(plan);

  if (!meridianUrl) {
    notFound();
  }

  redirect(meridianUrl);
}
