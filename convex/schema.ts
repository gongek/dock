import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { pageAccessSettingsValidator } from "./lib/pageAccessTypes";
import { siteProtectedPageValidator } from "./lib/siteProtectedPage";

const siteAccessSettingsValidator = v.object({
  allowCollaborators: v.boolean(),
  allowGuildAdministrators: v.boolean(),
  allowManageServer: v.boolean(),
});

const siteThemeValidator = v.object({
  background: v.optional(v.string()),
  foreground: v.optional(v.string()),
  surface: v.optional(v.string()),
  accent: v.optional(v.string()),
});

const navbarStyleValidator = v.union(
  v.literal("default"),
  v.literal("minimal"),
  v.literal("bar"),
  v.literal("hidden"),
);

const navbarMenuValidator = v.union(
  v.literal("links"),
  v.literal("hamburger"),
  v.literal("auto"),
);

const navbarAlignValidator = v.union(
  v.literal("start"),
  v.literal("center"),
  v.literal("between"),
  v.literal("end"),
);

const navbarLinkStyleValidator = v.union(v.literal("text"), v.literal("pills"));

const navbarBrandSideValidator = v.union(v.literal("start"), v.literal("end"));

const moderationCaseTypeValidator = v.union(
  v.literal("warn"),
  v.literal("note"),
  v.literal("kick"),
  v.literal("ban"),
  v.literal("timeout"),
  v.literal("mute"),
  v.literal("unban"),
  v.literal("remove-timeout"),
  v.literal("custom"),
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    meridianId: v.optional(v.string()),
    discordId: v.optional(v.string()),
    /** Stub for Meridian plan lookup; defaults to free when unset. */
    ownerPlan: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_meridian_id", ["meridianId"])
    .index("by_discord_id", ["discordId"]),
  pendingDiscordSignups: defineTable({
    token: v.string(),
    providerAccountId: v.string(),
    profile: v.any(),
    signature: v.string(),
    redirectTo: v.string(),
    expirationTime: v.number(),
  }).index("by_token", ["token"]),

  meridianOAuthTokens: defineTable({
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  /** Mock Meridian bots until API integration. */
  meridianMockBots: defineTable({
    meridianBotId: v.string(),
    label: v.string(),
    labelLower: v.string(),
    name: v.string(),
    ownerUserId: v.id("users"),
    linkedGuildId: v.optional(v.string()),
    collaboratorUserIds: v.optional(v.array(v.id("users"))),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerUserId"])
    .index("by_meridian_bot_id", ["meridianBotId"])
    .index("by_label_lower", ["labelLower"]),

  sites: defineTable({
    ownerUserId: v.id("users"),
    hostKind: v.union(v.literal("bot_subdomain"), v.literal("custom_slug")),
    slug: v.string(),
    slugLower: v.string(),
    title: v.string(),
    faviconKey: v.optional(v.string()),
    faviconStorageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("draft"), v.literal("published")),
    meridianBotId: v.optional(v.string()),
    botName: v.optional(v.string()),
    linkedGuildId: v.optional(v.string()),
    accessSettings: siteAccessSettingsValidator,
    theme: siteThemeValidator,
    navbarStyle: v.optional(navbarStyleValidator),
    navbarText: v.optional(v.string()),
    navbarMenu: v.optional(navbarMenuValidator),
    navbarAlign: v.optional(navbarAlignValidator),
    navbarBrandSide: v.optional(navbarBrandSideValidator),
    navbarLinkStyle: v.optional(navbarLinkStyleValidator),
    navbarShowBrand: v.optional(v.boolean()),
    /** Paid plans may opt out of the public "Powered by Dock.surf" mark. */
    hideDockBranding: v.optional(v.boolean()),
    protectedPage: v.optional(siteProtectedPageValidator),
    caseUrlPattern: v.string(),
    publishedSnapshotJson: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerUserId"])
    .index("by_slug_lower", ["slugLower"])
    .index("by_meridian_bot_id", ["meridianBotId"]),

  sitePages: defineTable({
    siteId: v.id("sites"),
    slug: v.string(),
    slugLower: v.string(),
    title: v.string(),
    kind: v.union(v.literal("standard"), v.literal("case_detail"), v.literal("protected")),
    sortOrder: v.number(),
    showInNav: v.boolean(),
    showBreadcrumbs: v.optional(v.boolean()),
    breadcrumbType: v.optional(v.union(v.literal("minimal"), v.literal("bar"))),
    pageAccessSettings: v.optional(pageAccessSettingsValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_site_and_slug", ["siteId", "slugLower"]),

  siteBlocks: defineTable({
    siteId: v.id("sites"),
    pageId: v.id("sitePages"),
    blockId: v.string(),
    type: v.string(),
    order: v.number(),
    parentBlockId: v.optional(v.string()),
    propsJson: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_page", ["pageId"])
    .index("by_site", ["siteId"])
    .index("by_page_and_block_id", ["pageId", "blockId"])
    .index("by_page_and_parent", ["pageId", "parentBlockId"]),

  siteMedia: defineTable({
    siteId: v.id("sites"),
    r2Key: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    filename: v.string(),
    mimeType: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_site", ["siteId"]),

  siteVariables: defineTable({
    siteId: v.id("sites"),
    key: v.string(),
    defaultValue: v.string(),
    source: v.union(v.literal("manual"), v.literal("meridian_case")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_site_and_key", ["siteId", "key"]),

  siteCaseCollections: defineTable({
    siteId: v.id("sites"),
    blockId: v.string(),
    meridianBotId: v.string(),
    scope: v.union(v.literal("guild"), v.literal("global")),
    guildKey: v.string(),
    typeFilter: v.string(),
    statusFilter: v.string(),
    detailPageId: v.optional(v.id("sitePages")),
    caseUrlPattern: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_site_and_block", ["siteId", "blockId"]),

  siteCaseRecords: defineTable({
    siteId: v.id("sites"),
    meridianBotId: v.string(),
    scope: v.union(v.literal("guild"), v.literal("global")),
    guildKey: v.string(),
    publicSlug: v.string(),
    caseNumber: v.number(),
    targetUserId: v.string(),
    type: moderationCaseTypeValidator,
    customType: v.optional(v.string()),
    reason: v.optional(v.string()),
    issuerUserId: v.optional(v.string()),
    channelId: v.optional(v.string()),
    evidenceUrl: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    customMetadataJson: v.optional(v.string()),
    revokedAt: v.optional(v.number()),
    revokedByUserId: v.optional(v.string()),
    revocationReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_site_and_public_slug", ["siteId", "publicSlug"])
    .index("by_site_and_case_number", ["siteId", "caseNumber"])
    .index("by_site_bot_scope_guild", ["siteId", "meridianBotId", "scope", "guildKey"]),

  siteDiscordSessions: defineTable({
    discordUserId: v.string(),
    accessTokenEnc: v.string(),
    refreshTokenEnc: v.optional(v.string()),
    username: v.optional(v.string()),
    globalName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_discord_user", ["discordUserId"]),

  siteAccessGrants: defineTable({
    siteId: v.id("sites"),
    discordUserId: v.string(),
    meridianUserId: v.optional(v.id("users")),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_site_and_discord", ["siteId", "discordUserId"])
    .index("by_expires_at", ["expiresAt"]),

  siteCustomDomains: defineTable({
    siteId: v.id("sites"),
    hostname: v.string(),
    hostnameLower: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("failed"),
    ),
    cloudflareHostnameId: v.optional(v.string()),
    sslStatus: v.optional(v.string()),
    verificationJson: v.optional(v.string()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    verifiedAt: v.optional(v.number()),
  })
    .index("by_hostname_lower", ["hostnameLower"])
    .index("by_site", ["siteId"]),
});
