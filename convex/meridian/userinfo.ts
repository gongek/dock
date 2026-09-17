import {
  pickBetterOwnerPlan,
  type OwnerPlan,
} from "../lib/siteLimits";

export const MERIDIAN_USERINFO_URL = "https://meridian.surf/api/oauth/userinfo";
export const MERIDIAN_BILLING_SUMMARY_URL =
  "https://meridian.surf/api/external/v1/billing/summary";

export type MeridianUserinfoBot = {
  id?: string;
  name?: string;
  label?: string;
  avatar?: string;
  avatarUrl?: string;
  status?: string;
  plan?: string;
  role?: string;
};

export type MeridianUserinfoPayload = {
  sub?: string;
  meridianId?: string;
  name?: string;
  discordId?: string;
  avatarUrl?: string;
  isMeridianStaff?: boolean;
  plan?: string;
  userPlan?: string;
  subscription?: {
    plan?: string;
  };
  bots?: MeridianUserinfoBot[];
  botCount?: number;
};

type MeridianBillingSummaryPayload = {
  products?: Array<{
    subscription?: {
      planLabel?: string;
    } | null;
  }>;
};

export function readMeridianStaffStatus(
  payload: MeridianUserinfoPayload,
): boolean {
  return payload.isMeridianStaff === true;
}

export function normalizeMeridianUserPlan(
  raw?: string | null,
): OwnerPlan | null {
  const value = raw?.trim().toLowerCase();
  if (!value) {
    return null;
  }

  if (value.includes("enterprise")) {
    return "enterprise";
  }
  if (value.includes("max")) {
    return "max";
  }
  if (value.includes("pro")) {
    return "pro";
  }
  if (value.includes("hobby")) {
    return "hobby";
  }
  if (value.includes("free")) {
    return "free";
  }

  switch (value) {
    case "free":
    case "hobby":
    case "pro":
    case "max":
    case "enterprise":
      return value;
    default:
      return null;
  }
}

function pickHigherMeridianPlan(
  current: OwnerPlan | null,
  candidate: OwnerPlan | null,
): OwnerPlan | null {
  if (!candidate) {
    return current;
  }
  if (!current) {
    return candidate;
  }
  return pickBetterOwnerPlan(current, candidate);
}

function highestMeridianPlanFromBots(
  bots: MeridianUserinfoBot[],
): OwnerPlan | null {
  const ownedBots = bots.filter((bot) => bot.role === "owner");
  const candidates = ownedBots.length > 0 ? ownedBots : bots;
  let best: OwnerPlan | null = null;

  for (const bot of candidates) {
    best = pickHigherMeridianPlan(best, normalizeMeridianUserPlan(bot.plan));
  }

  return best;
}

export function readMeridianUserPlan(
  payload: MeridianUserinfoPayload,
): OwnerPlan | null {
  let best: OwnerPlan | null = null;

  for (const candidate of [
    payload.plan,
    payload.userPlan,
    payload.subscription?.plan,
  ]) {
    best = pickHigherMeridianPlan(best, normalizeMeridianUserPlan(candidate));
  }

  const bots = Array.isArray(payload.bots) ? payload.bots : [];
  best = pickHigherMeridianPlan(best, highestMeridianPlanFromBots(bots));

  return best;
}

export async function fetchMeridianUserinfo(
  accessToken: string,
): Promise<MeridianUserinfoPayload> {
  const response = await fetch(MERIDIAN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Meridian userinfo failed (${response.status}).`);
  }

  return (await response.json()) as MeridianUserinfoPayload;
}

async function fetchMeridianBillingSummary(
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
  const payload = await fetchMeridianBillingSummary(accessToken);
  if (!payload) {
    return null;
  }

  let best: OwnerPlan | null = null;

  for (const product of payload.products ?? []) {
    best = pickHigherMeridianPlan(
      best,
      normalizeMeridianUserPlan(product.subscription?.planLabel),
    );
  }

  return best;
}

export async function resolveMeridianUserPlan(accessToken: string): Promise<{
  plan: OwnerPlan | null;
  isMeridianStaff: boolean;
  userinfo: MeridianUserinfoPayload;
}> {
  const userinfo = await fetchMeridianUserinfo(accessToken);
  let plan = readMeridianUserPlan(userinfo);
  const billingPlan = await fetchMeridianBillingPlan(accessToken);
  plan = pickHigherMeridianPlan(plan, billingPlan);

  return {
    plan,
    isMeridianStaff: readMeridianStaffStatus(userinfo),
    userinfo,
  };
}
