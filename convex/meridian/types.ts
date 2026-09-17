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

export type MeridianBotSummary = {
  meridianBotId: string;
  label: string;
  name: string;
  linkedGuildId?: string;
};

export type MeridianAdapter = {
  listBotsForUser(userId: string): Promise<MeridianBotSummary[]>;
  listCases(input: {
    meridianBotId: string;
    scope?: "guild" | "global";
    guildKey?: string;
    typeFilter?: string;
    statusFilter?: string;
  }): Promise<ModerationCaseRowPayload[]>;
};
