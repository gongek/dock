import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrNull } from "./lib/auth";
import {
  canHideDockBranding,
  canPublishPublicly,
  canUseCustomSlug,
  maxSitesForPlan,
  normalizeOwnerPlan,
  shouldShowDockBranding,
} from "./lib/siteLimits";
import {
  DEFAULT_ACCESS_SETTINGS,
  DEFAULT_CASE_URL_PATTERN,
  DEFAULT_SITE_THEME,
  normalizeSiteSlug,
} from "./lib/siteValidators";
import { resolvePublishedNavbar, type PublishedSnapshot } from "./lib/siteTypes";
import {
  isBreadcrumbBlockType,
  parseBlockProps,
  resolveBreadcrumbType,
  resolveShowBreadcrumbs,
} from "./lib/pageBreadcrumbs";
import { resolvePageAccessSettings } from "./lib/pageAccessTypes";
import {
  normalizeSiteProtectedPageInput,
  resolveSiteProtectedPage,
  siteProtectedPageValidator,
} from "./lib/siteProtectedPage";
import { tryPublicUrlForR2Key } from "./r2Env";
import { resolveSiteBot } from "./lib/siteBot";

function getUserPlan(user: Doc<"users">) {
  return normalizeOwnerPlan(user.ownerPlan);
}

async function resolveShowDockBranding(ctx: { db: any }, site: Doc<"sites">) {
  const owner = (await ctx.db.get(site.ownerUserId)) as Doc<"users"> | null;
  const plan = owner ? getUserPlan(owner) : "free";
  return shouldShowDockBranding(plan, site.hideDockBranding);
}

function resolveFaviconUrl(faviconKey: string | undefined) {
  if (!faviconKey) return null;
  return tryPublicUrlForR2Key(faviconKey);
}

async function countSitesForOwner(ctx: { db: any }, ownerUserId: Id<"users">) {
  const sites = await ctx.db
    .query("sites")
    .withIndex("by_owner", (q: any) => q.eq("ownerUserId", ownerUserId))
    .collect();
  return sites.length;
}

async function assertSiteOwner(
  ctx: { db: any },
  siteId: Id<"sites">,
  userId: Id<"users">,
) {
  const site = await ctx.db.get(siteId);
  if (!site || site.ownerUserId !== userId) {
    throw new Error("Site not found.");
  }
  return site;
}

export const listMySites = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const sites = await ctx.db
      .query("sites")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", user._id))
      .collect();
    sites.sort((a, b) => b.updatedAt - a.updatedAt);
    const plan = getUserPlan(user);
    return {
      plan,
      maxSites: maxSitesForPlan(plan),
      sites: sites.map((site) => ({
        _id: site._id,
        title: site.title,
        slug: site.slug,
        hostKind: site.hostKind,
        status: site.status,
        meridianBotId: site.meridianBotId,
        updatedAt: site.updatedAt,
        publishedAt: site.publishedAt,
      })),
    };
  },
});

export const getSite = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    const plan = getUserPlan(user);
    return {
      ...site,
      plan,
      showDockBranding: shouldShowDockBranding(plan, site.hideDockBranding),
      faviconUrl: resolveFaviconUrl(site.faviconKey),
      bot: await resolveSiteBot(ctx, site),
    };
  },
});

export const getSiteEditorBootstrap = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return {
        ok: false as const,
        error: "not_authenticated" as const,
      };
    }

    const site = await ctx.db.get(args.siteId);
    if (!site || site.ownerUserId !== user._id) {
      return {
        ok: false as const,
        error: "forbidden" as const,
      };
    }

    const plan = getUserPlan(user);
    const pages = await ctx.db
      .query("sitePages")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    pages.sort((a, b) => a.sortOrder - b.sortOrder);

    const blocks = await ctx.db
      .query("siteBlocks")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    const crumbPropsByPage = new Map<string, Record<string, unknown>>();
    for (const block of blocks) {
      if (!isBreadcrumbBlockType(block.type) || crumbPropsByPage.has(block.pageId)) {
        continue;
      }
      crumbPropsByPage.set(block.pageId, parseBlockProps(block.propsJson));
    }

    return {
      ok: true as const,
      site: {
        ...site,
        plan,
        showDockBranding: shouldShowDockBranding(plan, site.hideDockBranding),
        faviconUrl: resolveFaviconUrl(site.faviconKey),
        bot: await resolveSiteBot(ctx, site),
      },
      pages: pages.map((page) => ({
        ...page,
        pageAccessSettings: resolvePageAccessSettings(page.pageAccessSettings),
        showBreadcrumbs: resolveShowBreadcrumbs(
          page.showBreadcrumbs,
          crumbPropsByPage.has(page._id),
        ),
        breadcrumbType: resolveBreadcrumbType(
          page.breadcrumbType,
          crumbPropsByPage.get(page._id),
        ),
      })),
    };
  },
});

export const getSiteBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slugLower = args.slug.trim().toLowerCase();
    if (!slugLower) return null;
    return (
      (await ctx.db
        .query("sites")
        .withIndex("by_slug_lower", (q) => q.eq("slugLower", slugLower))
        .unique()) ?? null
    );
  },
});

export const getSiteHostById = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site) return null;
    return {
      siteId: site._id,
      slug: site.slug,
      hostKind: site.hostKind,
    };
  },
});

export const createBotSite = mutation({
  args: {
    meridianBotId: v.string(),
    botLabel: v.string(),
    title: v.string(),
    linkedGuildId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const plan = getUserPlan(user);
    const maxSites = maxSitesForPlan(plan);
    const count = await countSitesForOwner(ctx, user._id);
    if (maxSites !== null && count >= maxSites) {
      throw new Error("Site limit reached for your plan.");
    }

    const meridianBotId = args.meridianBotId.trim();
    const slug = normalizeSiteSlug(meridianBotId);
    if (!slug) throw new Error("Invalid Meridian bot id.");

    const existingBotSite = await ctx.db
      .query("sites")
      .withIndex("by_meridian_bot_id", (q) => q.eq("meridianBotId", meridianBotId))
      .unique();
    if (existingBotSite) {
      throw new Error("That Meridian bot already has a Dock site.");
    }

    const existing = await ctx.db
      .query("sites")
      .withIndex("by_slug_lower", (q) => q.eq("slugLower", slug))
      .unique();
    if (existing) throw new Error("That subdomain is already in use.");

    const now = Date.now();
    const title = args.title.trim() || slug;
    const siteId = await ctx.db.insert("sites", {
      ownerUserId: user._id,
      hostKind: "bot_subdomain",
      slug,
      slugLower: slug,
      title,
      status: "draft",
      meridianBotId,
      botName: title,
      linkedGuildId: args.linkedGuildId?.trim() || undefined,
      accessSettings: { ...DEFAULT_ACCESS_SETTINGS },
      theme: { ...DEFAULT_SITE_THEME },
      navbarStyle: "default",
      navbarText: title,
      navbarMenu: "links",
      navbarAlign: "between",
      navbarLinkStyle: "text",
      navbarShowBrand: true,
      caseUrlPattern: DEFAULT_CASE_URL_PATTERN,
      createdAt: now,
      updatedAt: now,
    });

    const homePageId = await ctx.db.insert("sitePages", {
      siteId,
      slug: "home",
      slugLower: "home",
      title: "Home",
      kind: "standard",
      sortOrder: 0,
      showInNav: true,
      showBreadcrumbs: false,
      breadcrumbType: "minimal",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("siteBlocks", {
      siteId,
      pageId: homePageId,
      blockId: "heading-home",
      type: "heading",
      order: 0,
      propsJson: JSON.stringify({ text: "Welcome", level: 1 }),
      createdAt: now,
      updatedAt: now,
    });

    return siteId;
  },
});

export const createCustomSite = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const plan = getUserPlan(user);
    if (!canUseCustomSlug(plan)) {
      throw new Error("Custom site slugs require a Hobby plan or higher.");
    }
    const maxSites = maxSitesForPlan(plan);
    const count = await countSitesForOwner(ctx, user._id);
    if (maxSites !== null && count >= maxSites) {
      throw new Error("Site limit reached for your plan.");
    }

    const slug = normalizeSiteSlug(args.slug);
    if (!slug) throw new Error("Invalid site slug.");

    const existing = await ctx.db
      .query("sites")
      .withIndex("by_slug_lower", (q) => q.eq("slugLower", slug))
      .unique();
    if (existing) throw new Error("That subdomain is already in use.");

    const now = Date.now();
    const siteId = await ctx.db.insert("sites", {
      ownerUserId: user._id,
      hostKind: "custom_slug",
      slug,
      slugLower: slug,
      title: args.title.trim() || slug,
      status: "draft",
      accessSettings: { ...DEFAULT_ACCESS_SETTINGS },
      theme: { ...DEFAULT_SITE_THEME },
      navbarStyle: "default",
      navbarText: args.title.trim() || slug,
      navbarMenu: "links",
      navbarAlign: "between",
      navbarLinkStyle: "text",
      navbarShowBrand: true,
      caseUrlPattern: DEFAULT_CASE_URL_PATTERN,
      createdAt: now,
      updatedAt: now,
    });

    const homePageId = await ctx.db.insert("sitePages", {
      siteId,
      slug: "home",
      slugLower: "home",
      title: "Home",
      kind: "standard",
      sortOrder: 0,
      showInNav: true,
      showBreadcrumbs: false,
      breadcrumbType: "minimal",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("siteBlocks", {
      siteId,
      pageId: homePageId,
      blockId: "heading-home",
      type: "heading",
      order: 0,
      propsJson: JSON.stringify({ text: "Welcome", level: 1 }),
      createdAt: now,
      updatedAt: now,
    });

    return siteId;
  },
});

export const updateSiteMeta = mutation({
  args: {
    siteId: v.id("sites"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    theme: v.optional(
      v.object({
        background: v.optional(v.string()),
        foreground: v.optional(v.string()),
        surface: v.optional(v.string()),
        accent: v.optional(v.string()),
      }),
    ),
    caseUrlPattern: v.optional(v.string()),
    navbarStyle: v.optional(
      v.union(
        v.literal("default"),
        v.literal("minimal"),
        v.literal("bar"),
        v.literal("hidden"),
      ),
    ),
    navbarText: v.optional(v.string()),
    navbarMenu: v.optional(
      v.union(v.literal("links"), v.literal("hamburger"), v.literal("auto")),
    ),
    navbarAlign: v.optional(
      v.union(
        v.literal("start"),
        v.literal("center"),
        v.literal("between"),
        v.literal("end"),
      ),
    ),
    navbarBrandSide: v.optional(v.union(v.literal("start"), v.literal("end"))),
    navbarLinkStyle: v.optional(v.union(v.literal("text"), v.literal("pills"))),
    navbarShowBrand: v.optional(v.boolean()),
    hideDockBranding: v.optional(v.boolean()),
    faviconKey: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    const patch: Partial<Doc<"sites">> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title.trim() || site.title;
    if (args.slug !== undefined) {
      const slug = normalizeSiteSlug(args.slug);
      if (!slug) throw new Error("Invalid site subdomain.");
      if (slug !== site.slugLower) {
        const existing = await ctx.db
          .query("sites")
          .withIndex("by_slug_lower", (q) => q.eq("slugLower", slug))
          .unique();
        if (existing) throw new Error("That subdomain is already in use.");
        patch.slug = slug;
        patch.slugLower = slug;
      }
    }
    if (args.theme !== undefined) patch.theme = { ...site.theme, ...args.theme };
    if (args.caseUrlPattern !== undefined) {
      patch.caseUrlPattern = args.caseUrlPattern.trim() || site.caseUrlPattern;
    }
    if (args.navbarStyle !== undefined) patch.navbarStyle = args.navbarStyle;
    if (args.navbarText !== undefined) patch.navbarText = args.navbarText;
    if (args.navbarMenu !== undefined) patch.navbarMenu = args.navbarMenu;
    if (args.navbarAlign !== undefined) patch.navbarAlign = args.navbarAlign;
    if (args.navbarBrandSide !== undefined) patch.navbarBrandSide = args.navbarBrandSide;
    if (args.navbarLinkStyle !== undefined) patch.navbarLinkStyle = args.navbarLinkStyle;
    if (args.navbarShowBrand !== undefined) patch.navbarShowBrand = args.navbarShowBrand;
    if (args.hideDockBranding !== undefined) {
      if (args.hideDockBranding && !canHideDockBranding(getUserPlan(user))) {
        throw new Error("Removing Dock branding requires a Hobby plan or higher.");
      }
      patch.hideDockBranding = args.hideDockBranding;
    }
    if (args.faviconKey) {
      const faviconKey = args.faviconKey.trim().replace(/^\/+/, "");
      if (!faviconKey.startsWith(`public/ugc/dock/${args.siteId}/`)) {
        throw new Error("Invalid favicon key.");
      }
      patch.faviconKey = faviconKey;
    }
    if (args.faviconKey === null) {
      const {
        _id,
        _creationTime: _created,
        faviconKey: _drop,
        faviconStorageId: _legacy,
        ...rest
      } = site;
      await ctx.db.replace(_id, { ...rest, ...patch, updatedAt: patch.updatedAt ?? Date.now() });
      return;
    }
    await ctx.db.patch(site._id, patch);
  },
});

export const updateSiteAccessSettings = mutation({
  args: {
    siteId: v.id("sites"),
    accessSettings: v.object({
      allowCollaborators: v.boolean(),
      allowGuildAdministrators: v.boolean(),
      allowManageServer: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    if (site.hostKind !== "bot_subdomain") {
      throw new Error("Staff access settings apply to bot subdomain sites only.");
    }
    await ctx.db.patch(site._id, {
      accessSettings: args.accessSettings,
      updatedAt: Date.now(),
    });
  },
});

export const updateSiteProtectedPage = mutation({
  args: {
    siteId: v.id("sites"),
    protectedPage: siteProtectedPageValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    await ctx.db.patch(site._id, {
      protectedPage: normalizeSiteProtectedPageInput(args.protectedPage),
      updatedAt: Date.now(),
    });
  },
});

export const publishSite = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    const plan = getUserPlan(user);
    if (site.hostKind === "custom_slug" && !canPublishPublicly(plan)) {
      throw new Error("Public publishing requires a Hobby plan or higher.");
    }

    const pages = await ctx.db
      .query("sitePages")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();
    pages.sort((a, b) => a.sortOrder - b.sortOrder);

    const collections = await ctx.db
      .query("siteCaseCollections")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();

    const publishedPages = [];
    for (const page of pages) {
      const blocks = await ctx.db
        .query("siteBlocks")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();
      blocks.sort((a, b) => a.order - b.order);
      const visibleBlocks = blocks.filter((block) => !isBreadcrumbBlockType(block.type));
      const crumbBlock = blocks.find((block) => isBreadcrumbBlockType(block.type));
      publishedPages.push({
        id: page._id,
        slug: page.slug,
        title: page.title,
        kind: page.kind,
        sortOrder: page.sortOrder,
        showInNav: page.showInNav,
        showBreadcrumbs: resolveShowBreadcrumbs(
          page.showBreadcrumbs,
          Boolean(crumbBlock),
        ),
        breadcrumbType: resolveBreadcrumbType(
          page.breadcrumbType,
          crumbBlock ? parseBlockProps(crumbBlock.propsJson) : undefined,
        ),
        pageAccessSettings: resolvePageAccessSettings(page.pageAccessSettings),
        blocks: visibleBlocks.map((block) => ({
          blockId: block.blockId,
          type: block.type,
          order: block.order,
          parentBlockId: block.parentBlockId,
          props: JSON.parse(block.propsJson) as Record<string, unknown>,
        })),
      });
    }

    const snapshot: PublishedSnapshot = {
      title: site.title,
      theme: site.theme,
      ...resolvePublishedNavbar(site),
      caseUrlPattern: site.caseUrlPattern,
      accessSettings: site.accessSettings,
      protectedPage: site.protectedPage,
      pages: publishedPages,
      caseCollections: collections.map((collection) => ({
        blockId: collection.blockId,
        meridianBotId: collection.meridianBotId,
        scope: collection.scope,
        guildKey: collection.guildKey,
        typeFilter: collection.typeFilter,
        statusFilter: collection.statusFilter,
        detailPageId: collection.detailPageId,
        caseUrlPattern: site.caseUrlPattern,
      })),
    };

    const now = Date.now();
    await ctx.db.patch(site._id, {
      status: "published",
      publishedSnapshotJson: JSON.stringify(snapshot),
      publishedAt: now,
      updatedAt: now,
    });
  },
});

export const getPublishedSiteBySlug = query({
  args: { slug: v.string(), draft: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const slugLower = args.slug.trim().toLowerCase();
    const site = await ctx.db
      .query("sites")
      .withIndex("by_slug_lower", (q) => q.eq("slugLower", slugLower))
      .unique();
    if (!site) return null;

    const useDraft = args.draft === true || site.hostKind === "bot_subdomain";

    if (useDraft) {
      const pages = await ctx.db
        .query("sitePages")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      pages.sort((a, b) => a.sortOrder - b.sortOrder);
      const pagePayloads = [];
      for (const page of pages) {
        const blocks = await ctx.db
          .query("siteBlocks")
          .withIndex("by_page", (q) => q.eq("pageId", page._id))
          .collect();
        blocks.sort((a, b) => a.order - b.order);
        const visibleBlocks = blocks.filter((block) => !isBreadcrumbBlockType(block.type));
        const crumbBlock = blocks.find((block) => isBreadcrumbBlockType(block.type));
        pagePayloads.push({
          ...page,
          showBreadcrumbs: resolveShowBreadcrumbs(
            page.showBreadcrumbs,
            Boolean(crumbBlock),
          ),
          breadcrumbType: resolveBreadcrumbType(
            page.breadcrumbType,
            crumbBlock ? parseBlockProps(crumbBlock.propsJson) : undefined,
          ),
          blocks: visibleBlocks.map((block) => ({
            ...block,
            props: JSON.parse(block.propsJson) as Record<string, unknown>,
          })),
        });
      }
      const collections = await ctx.db
        .query("siteCaseCollections")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      const showDockBranding = await resolveShowDockBranding(ctx, site);
      const faviconUrl = resolveFaviconUrl(site.faviconKey);
      const bot = await resolveSiteBot(ctx, site);
      return {
        site,
        mode: "draft" as const,
        pages: pagePayloads,
        collections,
        showDockBranding,
        faviconUrl,
        bot,
      };
    }

    if (!site.publishedSnapshotJson) return null;
    const snapshot = JSON.parse(site.publishedSnapshotJson) as PublishedSnapshot;
    const showDockBranding = await resolveShowDockBranding(ctx, site);
    const faviconUrl = resolveFaviconUrl(site.faviconKey);
    const bot = await resolveSiteBot(ctx, site);
    return { site, mode: "published" as const, snapshot, showDockBranding, faviconUrl, bot };
  },
});
