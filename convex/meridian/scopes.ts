/**
 * Meridian OAuth scopes and incremental consent bundles for Dock.
 * See docs/meridian-integration.md for the Meridian-side spec.
 */

export const MERIDIAN_SCOPE = {
  userIdentify: "user.identify",
  userStaffRead: "user.staff.read",
  userBillingRead: "user.billing.read",
  /** @deprecated Meridian alias — kept for token grants during migration */
  legacyStaff: "isMeridianStaff",
  /** Full Stripe summary — avoid for core Dock; use userBillingRead */
  legacyBillingRead: "billing.read",
  botsRead: "bots.read",
  botsWrite: "bots.write",
  flowsRead: "flows.read",
  flowsWrite: "flows.write",
  guildsRead: "guilds.read",
  guildsMetadataRead: "guilds.metadata.read",
  guildsMembersRead: "guilds.members.read",
  coworkRead: "cowork.read",
  logsRead: "logs.read",
  offlineAccess: "offline_access",
  variablesRead: "variables.read",
  casesRead: "cases.read",
  botstatusRead: "botstatus.read",
  botstatusWrite: "botstatus.write",
  webhooksRead: "webhooks.read",
  webhooksInvoke: "webhooks.invoke",
} as const;

/** Default scopes on Meridian sign-in (plan §5b core bundle). */
export const DOCK_MERIDIAN_OAUTH_SCOPES_CORE = [
  MERIDIAN_SCOPE.userIdentify,
  MERIDIAN_SCOPE.userStaffRead,
  MERIDIAN_SCOPE.userBillingRead,
  MERIDIAN_SCOPE.legacyStaff,
  MERIDIAN_SCOPE.botsRead,
  MERIDIAN_SCOPE.flowsRead,
  MERIDIAN_SCOPE.guildsRead,
  MERIDIAN_SCOPE.offlineAccess,
].join(" ");

export const DOCK_MERIDIAN_SCOPE_BUNDLE = {
  core: DOCK_MERIDIAN_OAUTH_SCOPES_CORE,
  staffDashboard: [MERIDIAN_SCOPE.coworkRead, MERIDIAN_SCOPE.logsRead].join(" "),
  publishedSiteData: [MERIDIAN_SCOPE.casesRead, MERIDIAN_SCOPE.variablesRead].join(
    " ",
  ),
  publicStatsSetup: [MERIDIAN_SCOPE.botstatusRead, MERIDIAN_SCOPE.botstatusWrite].join(
    " ",
  ),
  ops: [
    MERIDIAN_SCOPE.botsWrite,
    MERIDIAN_SCOPE.botstatusWrite,
  ].join(" "),
  automationInvoke: [
    MERIDIAN_SCOPE.flowsRead,
    MERIDIAN_SCOPE.webhooksRead,
    MERIDIAN_SCOPE.webhooksInvoke,
  ].join(" "),
  automationSetup: [MERIDIAN_SCOPE.flowsWrite, MERIDIAN_SCOPE.webhooksRead].join(
    " ",
  ),
  guildBuilder: [MERIDIAN_SCOPE.guildsMetadataRead].join(" "),
} as const;
