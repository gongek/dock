import {
  pickBetterOwnerPlan,
  type OwnerPlan,
} from "../lib/siteLimits";
import {
  MERIDIAN_BILLING_SUMMARY_URL,
  MERIDIAN_USER_BILLING_URL,
} from "./apiPaths";
import {
  normalizeMeridianUserPlan,
  type MeridianUserBillingSnapshot,
  type MeridianUserinfoPayload,
} from "./userinfo";

export type { MeridianUserBillingSnapshot };

type MeridianBillingSummaryPayload = {
  products?: Array<{
    subscription?: {
      planLabel?: string;
    } | null;
  }>;
};

function pickHigherMeridianPlan(
  current: OwnerPlan | null,
  candidate: OwnerPlan | null,
): OwnerPlan | null {
  if (!candidate) return current;
  if (!current) return candidate;
  return pickBetterOwnerPlan(current, candidate);
}

function planFromUserBillingSnapshot(
  snapshot: MeridianUserBillingSnapshot | null | undefined,
): OwnerPlan | null {
  if (!snapshot) return null;
  let best: OwnerPlan | null = null;
  for (const candidate of [snapshot.plan, snapshot.planLabel]) {
    best = pickHigherMeridianPlan(best, normalizeMeridianUserPlan(candidate));
  }
  for (const product of snapshot.products ?? []) {
    best = pickHigherMeridianPlan(
      best,
      normalizeMeridianUserPlan(product.planLabel),
    );
  }
  return best;
}

export function readUserBillingFromUserinfo(
  payload: MeridianUserinfoPayload,
): MeridianUserBillingSnapshot | null {
  const billing = payload.billing;
  if (!billing || typeof billing !== "object") {
    return null;
  }
  return billing;
}

export async function fetchMeridianUserBillingSnapshot(
  accessToken: string,
): Promise<MeridianUserBillingSnapshot | null> {
  const response = await fetch(MERIDIAN_USER_BILLING_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    return null;
  }
  try {
    return (await response.json()) as MeridianUserBillingSnapshot;
  } catch {
    return null;
  }
}

async function fetchMeridianBillingSummaryLegacy(
  accessToken: string,
): Promise<MeridianBillingSummaryPayload | null> {
  const response = await fetch(MERIDIAN_BILLING_SUMMARY_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as MeridianBillingSummaryPayload;
}

export async function fetchMeridianBillingPlan(
  accessToken: string,
): Promise<OwnerPlan | null> {
  const summary = await fetchMeridianBillingSummaryLegacy(accessToken);
  if (!summary) {
    return null;
  }
  let best: OwnerPlan | null = null;
  for (const product of summary.products ?? []) {
    best = pickHigherMeridianPlan(
      best,
      normalizeMeridianUserPlan(product.subscription?.planLabel),
    );
  }
  return best;
}

/** Prefer user.billing.read payload, then userinfo.billing, then legacy billing.summary. */
export async function resolveMeridianBillingPlan(
  accessToken: string,
  userinfo: MeridianUserinfoPayload,
): Promise<OwnerPlan | null> {
  let best = planFromUserBillingSnapshot(readUserBillingFromUserinfo(userinfo));

  const userBilling = await fetchMeridianUserBillingSnapshot(accessToken);
  best = pickHigherMeridianPlan(best, planFromUserBillingSnapshot(userBilling));

  if (best == null) {
    best = await fetchMeridianBillingPlan(accessToken);
  }

  return best;
}
