import {
  normalizeOwnerPlan,
  pickBetterOwnerPlan,
  type OwnerPlan,
} from "./siteLimits";

export const DOCK_LITE_OWNER_PLAN: OwnerPlan = "hobby";
export const DOCK_PRO_OWNER_PLAN: OwnerPlan = "pro";

export function meridianPlanQualifiesForDockLite(plan: OwnerPlan): boolean {
  return plan === "max" || plan === "enterprise";
}

export function ownerPlanAfterMeridianEntitlements(
  currentOwnerPlan: OwnerPlan,
  meridianPlan: OwnerPlan | null,
  isMeridianStaff: boolean,
): OwnerPlan {
  let next = currentOwnerPlan;

  if (isMeridianStaff) {
    next = pickBetterOwnerPlan(next, DOCK_PRO_OWNER_PLAN);
  }

  if (meridianPlan && meridianPlanQualifiesForDockLite(meridianPlan)) {
    next = pickBetterOwnerPlan(next, DOCK_LITE_OWNER_PLAN);
  }

  return next;
}
