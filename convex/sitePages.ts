import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import type { Id } from "./_generated/dataModel";
import {
  isBreadcrumbBlockType,
  parseBlockProps,
  resolveBreadcrumbType,
  resolveShowBreadcrumbs,
} from "./lib/pageBreadcrumbs";
import {
  DEFAULT_PAGE_ACCESS_SETTINGS,
  pageAccessSettingsValidator,
  resolvePageAccessSettings,
  validatePageAccessSettings,
} from "./lib/pageAccessTypes";

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

const RESERVED_PAGE_SLUGS = new Set(["home", "edit", "protected-page"]);

function normalizePageSlug(raw: string): string | null {
  const slug = raw.trim().toLowerCase();
  if (!slug || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug)) return null;
  return slug;
}

export const listPages = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertSiteOwner(ctx, args.siteId, user._id);
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
      if (!isBreadcrumbBlockType(block.type) || crumbPropsByPage.has(block.pageId)) continue;
      crumbPropsByPage.set(block.pageId, parseBlockProps(block.propsJson));
    }
    return pages.map((page) => ({
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
    }));
  },
});

export const createPage = mutation({
  args: {
    siteId: v.id("sites"),
    slug: v.string(),
    title: v.string(),
    kind: v.optional(
      v.union(v.literal("standard"), v.literal("case_detail"), v.literal("protected")),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    const slug = normalizePageSlug(args.slug);
    if (!slug) throw new Error("Invalid page slug.");
    if (RESERVED_PAGE_SLUGS.has(slug)) {
      throw new Error("That page slug is reserved.");
    }

    const existing = await ctx.db
      .query("sitePages")
      .withIndex("by_site_and_slug", (q) =>
        q.eq("siteId", site._id).eq("slugLower", slug),
      )
      .unique();
    if (existing) throw new Error("Page slug already exists.");

    const pages = await ctx.db
      .query("sitePages")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();
    const now = Date.now();
    return await ctx.db.insert("sitePages", {
      siteId: site._id,
      slug,
      slugLower: slug,
      title: args.title.trim() || slug,
      kind: args.kind ?? "standard",
      sortOrder: pages.length,
      showInNav: args.kind !== "case_detail" && args.kind !== "protected",
      showBreadcrumbs:
        args.kind !== "case_detail" && args.kind !== "protected" && slug !== "home",
      breadcrumbType: "minimal",
      pageAccessSettings: DEFAULT_PAGE_ACCESS_SETTINGS,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const ensureCaseDetailPage = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    const existing = await ctx.db
      .query("sitePages")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();
    const detail = existing.find((page) => page.kind === "case_detail");
    if (detail) return detail._id;

    const now = Date.now();
    const pageId = await ctx.db.insert("sitePages", {
      siteId: site._id,
      slug: "case-detail",
      slugLower: "case-detail",
      title: "Case detail",
      kind: "case_detail",
      sortOrder: existing.length,
      showInNav: false,
      showBreadcrumbs: false,
      breadcrumbType: "minimal",
      pageAccessSettings: DEFAULT_PAGE_ACCESS_SETTINGS,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("siteBlocks", {
      siteId: site._id,
      pageId,
      blockId: "heading-case",
      type: "heading",
      order: 0,
      propsJson: JSON.stringify({ text: "Case #{case.case_number}", level: 1 }),
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("siteBlocks", {
      siteId: site._id,
      pageId,
      blockId: "text-case-reason",
      type: "text",
      order: 1,
      propsJson: JSON.stringify({ text: "{case.reason}" }),
      createdAt: now,
      updatedAt: now,
    });

    return pageId;
  },
});

export const ensureProtectedPage = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    const existing = await ctx.db
      .query("sitePages")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .collect();
    const protectedPage = existing.find((page) => page.kind === "protected");
    if (protectedPage) return protectedPage._id;

    const now = Date.now();
    const pageId = await ctx.db.insert("sitePages", {
      siteId: site._id,
      slug: "protected-page",
      slugLower: "protected-page",
      title: "Protected page",
      kind: "protected",
      sortOrder: existing.length,
      showInNav: false,
      showBreadcrumbs: false,
      breadcrumbType: "minimal",
      pageAccessSettings: DEFAULT_PAGE_ACCESS_SETTINGS,
      createdAt: now,
      updatedAt: now,
    });

    return pageId;
  },
});

export const updatePage = mutation({
  args: {
    pageId: v.id("sitePages"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    showInNav: v.optional(v.boolean()),
    showBreadcrumbs: v.optional(v.boolean()),
    breadcrumbType: v.optional(v.union(v.literal("minimal"), v.literal("bar"))),
    sortOrder: v.optional(v.number()),
    pageAccessSettings: v.optional(pageAccessSettingsValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) throw new Error("Page not found.");
    const site = await assertSiteOwner(ctx, page.siteId, user._id);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title.trim() || page.title;
    if (args.showInNav !== undefined) patch.showInNav = args.showInNav;
    if (args.showBreadcrumbs !== undefined) {
      patch.showBreadcrumbs = args.showBreadcrumbs;
    }
    if (args.breadcrumbType !== undefined) patch.breadcrumbType = args.breadcrumbType;
    if (args.sortOrder !== undefined) patch.sortOrder = args.sortOrder;
    if (args.pageAccessSettings !== undefined) {
      patch.pageAccessSettings = validatePageAccessSettings({
        settings: args.pageAccessSettings,
        linkedGuildId: site.linkedGuildId,
      });
    }

    if (args.slug !== undefined) {
      const slug = normalizePageSlug(args.slug);
      if (!slug) throw new Error("Invalid page slug.");
      if (page.slugLower === "home" && slug !== "home") {
        throw new Error("The home page slug cannot be changed.");
      }
      if (page.kind === "protected") {
        throw new Error("The protected page slug cannot be changed.");
      }
      if (RESERVED_PAGE_SLUGS.has(slug) && slug !== page.slugLower) {
        throw new Error("That page slug is reserved.");
      }
      if (slug !== page.slugLower) {
        const existing = await ctx.db
          .query("sitePages")
          .withIndex("by_site_and_slug", (q) =>
            q.eq("siteId", page.siteId).eq("slugLower", slug),
          )
          .unique();
        if (existing) throw new Error("Page slug already exists.");
        patch.slug = slug;
        patch.slugLower = slug;
      }
    }

    await ctx.db.patch(page._id, patch);
  },
});

export const deletePage = mutation({
  args: { pageId: v.id("sitePages") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) return;
    await assertSiteOwner(ctx, page.siteId, user._id);
    if (page.slugLower === "home") {
      throw new Error("The home page cannot be deleted.");
    }
    if (page.kind === "protected") {
      throw new Error("The protected page cannot be deleted.");
    }
    const blocks = await ctx.db
      .query("siteBlocks")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect();
    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }
    await ctx.db.delete(page._id);
  },
});
