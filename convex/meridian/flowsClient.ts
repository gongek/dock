import { meridianBotFlowsUrl } from "./apiPaths";
import type { MeridianUserinfoFlow } from "./userinfo";

type MeridianFlowsListResponse = {
  flows?: MeridianUserinfoFlow[];
};

/** Paginated flow list when userinfo `flows` array is capped (`flows.read`). */
export async function fetchMeridianBotFlows(input: {
  accessToken: string;
  meridianBotId: string;
}): Promise<MeridianUserinfoFlow[]> {
  const response = await fetch(meridianBotFlowsUrl(input.meridianBotId), {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  try {
    const payload = (await response.json()) as MeridianFlowsListResponse;
    return Array.isArray(payload.flows) ? payload.flows : [];
  } catch {
    return [];
  }
}
