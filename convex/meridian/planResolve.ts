import {
  pickBetterOwnerPlan,
  type OwnerPlan,
} from "../lib/siteLimits";
import { resolveMeridianBillingPlan } from "./billing";
import {
  fetchMeridianUserinfo,
  readMeridianStaffStatus,
  readMeridianUserPlan,
  type MeridianUserinfoPayload,
} from "./userinfo";

function pickHigherMeridianPlan(
  current: OwnerPlan | null,
  candidate: OwnerPlan | null,
): OwnerPlan | null {
  if (!candidate) return current;
  if (!current) return candidate;
  return pickBetterOwnerPlan(current, candidate);
}

export async function resolveMeridianUserPlan(accessToken: string): Promise<{
  plan: OwnerPlan | null;
  isMeridianStaff: boolean;
  userinfo: MeridianUserinfoPayload;
}> {
  const userinfo = await fetchMeridianUserinfo(accessToken);
  let plan = readMeridianUserPlan(userinfo);
  const billingPlan = await resolveMeridianBillingPlan(accessToken, userinfo);
  plan = pickHigherMeridianPlan(plan, billingPlan);

  return {
    plan,
    isMeridianStaff: readMeridianStaffStatus(userinfo),
    userinfo,
  };
}
