import { meridianPublicBotStatusUrl } from "./apiPaths";

export type MeridianBotStatusPayload = {
  online?: boolean;
  discordId?: string;
  name?: string;
  hostingEnabled?: boolean;
  presence?: string | null;
  uptimeMs?: number | null;
  guildCount?: number | null;
  shardCount?: number | null;
  memberCount?: number | null;
  totalMemberCount?: number | null;
};

export async function fetchMeridianBotStatus(
  botRef: string,
): Promise<MeridianBotStatusPayload | null> {
  const ref = botRef.trim();
  if (!ref) {
    return null;
  }

  const response = await fetch(meridianPublicBotStatusUrl(ref), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as MeridianBotStatusPayload;
}

export function readMemberCountFromStatus(
  status: MeridianBotStatusPayload | null,
): number | null {
  if (!status) {
    return null;
  }
  if (typeof status.memberCount === "number" && Number.isFinite(status.memberCount)) {
    return status.memberCount;
  }
  if (
    typeof status.totalMemberCount === "number" &&
    Number.isFinite(status.totalMemberCount)
  ) {
    return status.totalMemberCount;
  }
  return null;
}
