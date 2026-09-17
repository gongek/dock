export type OwnerPlan = "free" | "hobby" | "pro" | "max" | "enterprise";

const PLAN_RANK: Record<OwnerPlan, number> = {
  free: 0,
  hobby: 1,
  pro: 2,
  max: 3,
  enterprise: 4,
};

export function pickBetterOwnerPlan(
  primary?: string | null,
  secondary?: string | null,
): OwnerPlan {
  const primaryPlan = normalizeOwnerPlan(primary);
  const secondaryPlan = normalizeOwnerPlan(secondary);
  if (PLAN_RANK[secondaryPlan] > PLAN_RANK[primaryPlan]) {
    return secondaryPlan;
  }
  return primaryPlan;
}

export function normalizeOwnerPlan(raw?: string | null): OwnerPlan {
  switch (raw?.trim().toLowerCase()) {
    case "hobby":
      return "hobby";
    case "pro":
      return "pro";
    case "max":
      return "max";
    case "enterprise":
      return "enterprise";
    default:
      return "free";
  }
}

export function maxSitesForPlan(plan: OwnerPlan): number | null {
  switch (plan) {
    case "free":
      return 1;
    case "hobby":
      return 2;
    case "pro":
    case "max":
    case "enterprise":
      return null;
    default:
      return 1;
  }
}

export function canPublishPublicly(plan: OwnerPlan): boolean {
  return plan !== "free";
}

export function canUseCustomSlug(plan: OwnerPlan): boolean {
  return plan !== "free";
}

export function canHideDockBranding(plan: OwnerPlan): boolean {
  return plan !== "free";
}

export function canUseCustomDomain(plan: OwnerPlan): boolean {
  return plan === "pro" || plan === "max" || plan === "enterprise";
}

export function maxCustomDomainsForPlan(plan: OwnerPlan): number {
  switch (plan) {
    case "pro":
      return 1;
    case "max":
    case "enterprise":
      return 5;
    default:
      return 0;
  }
}

export function shouldShowDockBranding(
  plan: OwnerPlan,
  hideDockBranding?: boolean | null,
): boolean {
  return !(canHideDockBranding(plan) && hideDockBranding === true);
}
