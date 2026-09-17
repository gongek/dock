import { v } from "convex/values";
import { query } from "./_generated/server";
import { matchCasePath } from "./lib/caseUrlPattern";
import {
  isPublicPageAccess,
  pageAccessSettingsForPage,
  resolvePageAccessSettings,
} from "./lib/pageAccessTypes";
import {
  protectedPageDocumentTitle,
} from "./lib/protectedPageBlocks";
import { resolveSiteProtectedPage } from "./lib/siteProtectedPage";
import {
  normalizeOwnerPlan,
  shouldShowDockBranding,
} from "./lib/siteLimits";
import type { PublishedBlock, PublishedSnapshot } from "./lib/siteTypes";
import { tryPublicUrlForR2Key } from "./r2Env";
import { isBreadcrumbBlockType } from "./lib/pageBreadcrumbs";

type PageSummary = {
  slug: string;
  kind: "standard" | "case_detail" | "protected";
  pageAccessSettings: ReturnType<typeof resolvePageAccessSettings>;
};

type PresentationBlock = {
  blockId: string;
  type: string;
  order: number;
  parentBlockId?: string;
  props: Record<string, unknown>;
};

function normalizePathname(pathname: string): string {
  if (pathname === "") return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function resolveTargetPageSlug(input: {
  pathname: string;
  caseUrlPattern: string;
  pages: PageSummary[];
}): string | null {
  const normalizedPath = normalizePathname(input.pathname);
  const caseMatch = matchCasePath(input.caseUrlPattern, normalizedPath);
  if (caseMatch?.publicSlug || caseMatch?.caseNumber) {
    const detailPage = input.pages.find((page) => page.kind === "case_detail");
    return detailPage?.slug ?? null;
  }

  const pageSlug =
    normalizedPath === "/" ? "home" : normalizedPath.slice(1).split("/")[0];
  const page =
    input.pages.find(
      (entry) => entry.slug === pageSlug && entry.kind !== "protected",
    ) ??
    input.pages.find((entry) => entry.slug === "home" && entry.kind !== "protected");
  return page?.slug ?? null;
}

function mapDraftPages(
  pages: Array<{
    slug: string;
    kind: "standard" | "case_detail" | "protected";
    pageAccessSettings?: Parameters<typeof resolvePageAccessSettings>[0];
  }>,
): PageSummary[] {
  return pages.map((page) => ({
    slug: page.slug,
    kind: page.kind,
    pageAccessSettings: pageAccessSettingsForPage(page),
  }));
}

function mapPublishedBlocks(blocks: PublishedBlock[]): PresentationBlock[] {
  return blocks
    .filter((block) => !isBreadcrumbBlockType(block.type))
    .map((block) => ({
      blockId: block.blockId,
      type: block.type,
      order: block.order,
      parentBlockId: block.parentBlockId,
      props: block.props,
    }));
}

function mapDraftBlocks(
  blocks: Array<{
    blockId: string;
    type: string;
    order: number;
    parentBlockId?: string;
    propsJson: string;
  }>,
): PresentationBlock[] {
  return blocks
    .filter((block) => !isBreadcrumbBlockType(block.type))
    .map((block) => ({
      blockId: block.blockId,
      type: block.type,
      order: block.order,
      parentBlockId: block.parentBlockId,
      props: JSON.parse(block.propsJson) as Record<string, unknown>,
    }));
}

export const getPageAccessContext = query({
  args: {
    siteSlug: v.string(),
    pathname: v.string(),
    draft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const slugLower = args.siteSlug.trim().toLowerCase();
    const site = await ctx.db
      .query("sites")
      .withIndex("by_slug_lower", (q) => q.eq("slugLower", slugLower))
      .unique();
    if (!site) return null;

    const useDraft = args.draft === true || site.hostKind === "bot_subdomain";
    let pages: PageSummary[] = [];
    let caseUrlPattern = site.caseUrlPattern;
    let protectedPageSource = site.protectedPage;
    let theme = site.theme;
    let protectedPageBlocks: PresentationBlock[] = [];
    let protectedPageTitle = "Protected page";
    let navPages: Array<{ slug: string; title: string; showInNav: boolean }> = [];

    if (useDraft) {
      const draftPages = await ctx.db
        .query("sitePages")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      pages = mapDraftPages(draftPages);
      navPages = draftPages
        .filter((page) => page.kind === "standard")
        .map((page) => ({
          slug: page.slug,
          title: page.title,
          showInNav: page.showInNav,
        }));
      const protectedPage = draftPages.find((page) => page.kind === "protected");
      if (protectedPage) {
        protectedPageTitle = protectedPageDocumentTitle(protectedPage.title);
        const blocks = await ctx.db
          .query("siteBlocks")
          .withIndex("by_page", (q) => q.eq("pageId", protectedPage._id))
          .collect();
        blocks.sort((a, b) => a.order - b.order);
        protectedPageBlocks = mapDraftBlocks(blocks);
      }
    } else if (site.publishedSnapshotJson) {
      const snapshot = JSON.parse(site.publishedSnapshotJson) as PublishedSnapshot;
      caseUrlPattern = snapshot.caseUrlPattern;
      theme = snapshot.theme;
      protectedPageSource = snapshot.protectedPage ?? site.protectedPage;
      pages = snapshot.pages.map((page) => ({
        slug: page.slug,
        kind: page.kind,
        pageAccessSettings: pageAccessSettingsForPage(page),
      }));
      const protectedPage = snapshot.pages.find((page) => page.kind === "protected");
      protectedPageBlocks = protectedPage ? mapPublishedBlocks(protectedPage.blocks) : [];
      protectedPageTitle = protectedPageDocumentTitle(protectedPage?.title);
      navPages = snapshot.pages
        .filter((page) => page.kind === "standard")
        .map((page) => ({
          slug: page.slug,
          title: page.title,
          showInNav: page.showInNav,
        }));
    } else {
      return null;
    }

    const targetPageSlug = resolveTargetPageSlug({
      pathname: args.pathname,
      caseUrlPattern,
      pages,
    });
    const targetPage = pages.find((page) => page.slug === targetPageSlug) ?? null;

    const owner = await ctx.db.get(site.ownerUserId);
    const showDockBranding = shouldShowDockBranding(
      normalizeOwnerPlan(owner?.ownerPlan),
      site.hideDockBranding,
    );

    const resolvedProtectedPage = resolveSiteProtectedPage(protectedPageSource);

    return {
      site: {
        _id: site._id,
        slug: site.slug,
        title: site.title,
        hostKind: site.hostKind,
        linkedGuildId: site.linkedGuildId,
        meridianBotId: site.meridianBotId,
      },
      targetPageSlug,
      pageAccessSettings: targetPage?.pageAccessSettings ?? resolvePageAccessSettings(null),
      pages: pages.map((page) => ({
        slug: page.slug,
        kind: page.kind,
        pageAccessSettings: page.pageAccessSettings,
        isPublic: isPublicPageAccess(page),
      })),
      presentation: {
        siteTitle: site.title,
        theme,
        protectedPage: resolvedProtectedPage,
        protectedPageTitle,
        protectedPageBlocks,
        showDockBranding,
        faviconUrl: site.faviconKey ? tryPublicUrlForR2Key(site.faviconKey) : null,
        navPages,
      },
    };
  },
});
