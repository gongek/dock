export const UPGRADE_PLAN_SLUGS = ["lite", "pro"] as const;

export type UpgradePlanSlug = (typeof UPGRADE_PLAN_SLUGS)[number];

export function resolveMeridianUpgradeUrl(plan: string): string | null {
  switch (plan) {
    case "lite":
      return "https://meridian.surf/pricing?plan=hobby";
    case "pro":
      return "https://meridian.surf/pricing?plan=pro";
    default:
      return null;
  }
}
