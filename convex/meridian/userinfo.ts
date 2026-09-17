import {
  pickBetterOwnerPlan,
  type OwnerPlan,
} from "../lib/siteLimits";
import {
  MERIDIAN_USERINFO_URL,
} from "./apiPaths";

export type MeridianUserBillingSnapshot = {
  plan?: string;
  planLabel?: string;
  status?: string;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  billingInterval?: string;
  products?: Array<{
    id?: string;
    planLabel?: string;
    status?: string;
    currentPeriodEnd?: number | null;
  }>;
};

export type MeridianUserinfoBot = {
  id?: string;
  name?: string;
  label?: string;
  avatar?: string;
  avatarUrl?: string;
  status?: string;
  plan?: string;
  role?: string;
  discordId?: string;
  applicationId?: string;
  guildCount?: number;
  serverCount?: number;
  servers?: number;
  memberCount?: number;
  members?: number;
  totalMemberCount?: number;
  uptimeMs?: number;
};

export type MeridianUserinfoFlow = {
  botId?: string;
  flowId?: string;
  kind?: string;
  type?: string;
  name?: string;
  publicCode?: string;
};

export type MeridianUserinfoGuild = {
  botId?: string;
  guildId?: string;
  name?: string;
  icon?: string;
  primary?: boolean;
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
  flows?: MeridianUserinfoFlow[];
  guilds?: MeridianUserinfoGuild[];
  billing?: MeridianUserBillingSnapshot;
  staff?: {
    meridianStaff?: boolean;
  };
};

export function readMeridianStaffStatus(
  payload: MeridianUserinfoPayload,
): boolean {
  if (payload.staff?.meridianStaff === true) {
    return true;
  }
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

export class MeridianUserinfoError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Meridian userinfo failed (${status}).`);
    this.name = "MeridianUserinfoError";
    this.status = status;
  }
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
    throw new MeridianUserinfoError(response.status);
  }

  try {
    return (await response.json()) as MeridianUserinfoPayload;
  } catch {
    throw new MeridianUserinfoError(response.status, "Invalid Meridian userinfo response.");
  }
}
