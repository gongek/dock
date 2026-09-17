export type ModerationCaseType =
  | "warn"
  | "note"
  | "kick"
  | "ban"
  | "timeout"
  | "mute"
  | "unban"
  | "remove-timeout"
  | "custom";

export type ModerationCaseRowPayload = {
  caseId: string;
  caseNumber: number;
  publicSlug: string;
  scope: "guild" | "global";
  guildKey: string;
  targetUserId: string;
  type: ModerationCaseType;
  customType?: string;
  reason?: string;
  issuerUserId?: string;
  channelId?: string;
  evidenceUrl?: string;
  durationMinutes?: number;
  expiresAt?: number;
  customMetadataJson?: string;
  revokedAt?: number;
  revokedByUserId?: string;
  revocationReason?: string;
  createdAt: number;
  updatedAt: number;
};

export function caseRecordToPayload(row: {
  _id: string;
  publicSlug: string;
  caseNumber: number;
  scope: "guild" | "global";
  guildKey: string;
  targetUserId: string;
  type: ModerationCaseType;
  customType?: string;
  reason?: string;
  issuerUserId?: string;
  channelId?: string;
  evidenceUrl?: string;
  durationMinutes?: number;
  expiresAt?: number;
  customMetadataJson?: string;
  revokedAt?: number;
  revokedByUserId?: string;
  revocationReason?: string;
  createdAt: number;
  updatedAt: number;
}): ModerationCaseRowPayload {
  return {
    caseId: row._id,
    caseNumber: row.caseNumber,
    publicSlug: row.publicSlug,
    scope: row.scope,
    guildKey: row.guildKey,
    targetUserId: row.targetUserId,
    type: row.type,
    customType: row.customType,
    reason: row.reason,
    issuerUserId: row.issuerUserId,
    channelId: row.channelId,
    evidenceUrl: row.evidenceUrl,
    durationMinutes: row.durationMinutes,
    expiresAt: row.expiresAt,
    customMetadataJson: row.customMetadataJson,
    revokedAt: row.revokedAt,
    revokedByUserId: row.revokedByUserId,
    revocationReason: row.revocationReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
