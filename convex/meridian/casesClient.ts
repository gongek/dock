import { meridianBotCasesUrl } from "./apiPaths";
import type { ModerationCaseRowPayload, ModerationCaseType } from "./types";

type MeridianCasesListResponse = {
  cases?: Array<Record<string, unknown>>;
};

const CASE_TYPES: ModerationCaseType[] = [
  "warn",
  "note",
  "kick",
  "ban",
  "timeout",
  "mute",
  "unban",
  "remove-timeout",
  "custom",
];

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeCaseType(value: unknown): ModerationCaseType {
  const raw = readString(value)?.toLowerCase();
  if (raw && CASE_TYPES.includes(raw as ModerationCaseType)) {
    return raw as ModerationCaseType;
  }
  return "custom";
}

export function mapMeridianCaseRow(
  row: Record<string, unknown>,
): ModerationCaseRowPayload | null {
  const caseId = readString(row.caseId) ?? readString(row.id);
  const caseNumber = readNumber(row.caseNumber);
  const publicSlug =
    readString(row.publicSlug) ?? readString(row.slug) ?? readString(row.public_slug);
  const targetUserId = readString(row.targetUserId) ?? readString(row.targetUser_id);
  const createdAt = readNumber(row.createdAt) ?? readNumber(row.created_at);
  const updatedAt = readNumber(row.updatedAt) ?? readNumber(row.updated_at) ?? createdAt;

  if (!caseId || caseNumber == null || !publicSlug || !targetUserId || createdAt == null) {
    return null;
  }

  const scopeRaw = readString(row.scope)?.toLowerCase();
  const scope: "guild" | "global" = scopeRaw === "global" ? "global" : "guild";

  return {
    caseId,
    caseNumber,
    publicSlug,
    scope,
    guildKey: readString(row.guildKey) ?? readString(row.guildId) ?? "0",
    targetUserId,
    type: normalizeCaseType(row.type),
    customType: readString(row.customType),
    reason: readString(row.reason),
    issuerUserId: readString(row.issuerUserId),
    channelId: readString(row.channelId),
    evidenceUrl: readString(row.evidenceUrl),
    durationMinutes: readNumber(row.durationMinutes),
    expiresAt: readNumber(row.expiresAt),
    customMetadataJson: readString(row.customMetadataJson),
    revokedAt: readNumber(row.revokedAt),
    revokedByUserId: readString(row.revokedByUserId),
    revocationReason: readString(row.revocationReason),
    createdAt,
    updatedAt: updatedAt ?? createdAt,
  };
}

export async function fetchMeridianCases(input: {
  accessToken: string;
  meridianBotId: string;
  scope?: "guild" | "global";
  guildKey?: string;
}): Promise<ModerationCaseRowPayload[]> {
  const params = new URLSearchParams();
  if (input.scope) params.set("scope", input.scope);
  if (input.guildKey?.trim()) params.set("guildKey", input.guildKey.trim());

  const base = meridianBotCasesUrl(input.meridianBotId);
  const url = params.size > 0 ? `${base}?${params.toString()}` : base;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  let payload: MeridianCasesListResponse;
  try {
    payload = (await response.json()) as MeridianCasesListResponse;
  } catch {
    return [];
  }

  const mapped: ModerationCaseRowPayload[] = [];
  for (const row of payload.cases ?? []) {
    if (!row || typeof row !== "object") continue;
    const caseRow = mapMeridianCaseRow(row);
    if (caseRow) {
      mapped.push(caseRow);
    }
  }

  return mapped.sort((a, b) => b.caseNumber - a.caseNumber);
}
