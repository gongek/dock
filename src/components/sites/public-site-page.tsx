import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { PageBreadcrumbs, type BreadcrumbType } from "@/components/blocks/page-breadcrumbs";
import { SiteShell } from "@/components/sites/site-shell";
import { caseRecordToPayload } from "@/lib/meridian/types";
import type { SiteBlock } from "@/lib/blocks/types";
import {
  buildBotTemplateContext,
  buildCaseTemplateContext,
  buildDiscordTemplateContext,
  type DiscordVisitorContext,
  type TemplateContext,
} from "@/lib/variables/resolve";
import { TemplateText } from "@/lib/variables/template-text";
import { matchCasePath } from "@/lib/cases/resolve-case-url";
import {
  pageAppearsInNavbar,
  pageHref,
  resolveNavbarStyle,
  resolveNavbarText,
} from "@/lib/sites/navbar";
import { resolveSiteDocumentTitle } from "@/lib/sites/document-meta";

type SitePayload = FunctionReturnType<typeof api.sites.getPublishedSiteBySlug>;
type CaseRecords = FunctionReturnType<typeof api.siteCases.listCaseRecords>;

type RenderPage = {
  id: string;
  slug: string;
  title: string;
  kind: "standard" | "case_detail" | "protected";
  sortOrder: number;
  showInNav: boolean;
  showBreadcrumbs: boolean;
  breadcrumbType: BreadcrumbType;
  blocks: Array<{
    blockId: string;
    type: string;
    order: number;
    parentBlockId?: string;
    props: Record<string, unknown>;
  }>;
};

type RenderBlock = RenderPage["blocks"][number];

function asBreadcrumbType(value: unknown): BreadcrumbType {
  return value === "bar" ? "bar" : "minimal";
}

function pageBreadcrumbType(
  breadcrumbType: unknown,
  blocks: Array<{ type: string; props?: Record<string, unknown> }>,
): BreadcrumbType {
  if (breadcrumbType === "bar" || breadcrumbType === "minimal") return breadcrumbType;
  const crumb = blocks.find((block) => block.type === "breadcrumbs");
  return asBreadcrumbType(crumb?.props?.theme ?? crumb?.props?.type);
}

function withDiscordContext<T extends TemplateContext>(
  context: T,
  discord: DiscordVisitorContext | undefined,
): T {
  return discord ? { ...context, discord } : context;
}

function siteTemplateFields(payload: NonNullable<SitePayload>) {
  return {
    site: { title: payload.site.title, slug: payload.site.slug },
    bot: buildBotTemplateContext(payload.bot) ??
      buildBotTemplateContext({
        id: payload.site.meridianBotId,
        name: payload.site.title,
      }),
  };
}

function navbarContextPages(pages: RenderPage[]) {
  return pages
    .filter((page) => page.kind !== "case_detail" && page.kind !== "protected")
    .map((page) => ({
      slug: page.slug,
      title: page.title,
      showInNav: pageAppearsInNavbar(page),
    }));
}

function siteRenderFields(payload: NonNullable<SitePayload>, preview = false) {
  const published = payload.mode === "published";
  const resolveVariables = published || preview;
  return {
    resolveVariables,
    ...(resolveVariables ? { mode: "public" as const } : {}),
  };
}

function buildView(
  payload: NonNullable<SitePayload>,
  pathname: string,
  caseRecords: CaseRecords | undefined,
  discord?: DiscordVisitorContext,
  preview = false,
) {
  const renderFields = siteRenderFields(payload, preview);
  const pages: RenderPage[] =
    payload.mode === "published"
      ? payload.snapshot.pages.map((page) => ({
          ...page,
          showBreadcrumbs:
            page.showBreadcrumbs ??
            page.blocks.some((block) => block.type === "breadcrumbs"),
          breadcrumbType: pageBreadcrumbType(page.breadcrumbType, page.blocks),
          blocks: page.blocks.filter((block) => block.type !== "breadcrumbs"),
        }))
      : payload.pages.map((page: {
          _id: string;
          slug: string;
          title: string;
          kind: "standard" | "case_detail" | "protected";
          sortOrder: number;
          showInNav: boolean;
          showBreadcrumbs?: boolean;
          breadcrumbType?: BreadcrumbType;
          blocks: Array<{
            blockId: string;
            type: string;
            order: number;
            parentBlockId?: string;
            props: Record<string, unknown>;
          }>;
        }) => ({
          id: page._id,
          slug: page.slug,
          title: page.title,
          kind: page.kind,
          sortOrder: page.sortOrder,
          showInNav: page.showInNav,
          showBreadcrumbs:
            page.showBreadcrumbs ??
            page.blocks.some((block) => block.type === "breadcrumbs"),
          breadcrumbType: pageBreadcrumbType(page.breadcrumbType, page.blocks),
          blocks: page.blocks
            .filter((block) => block.type !== "breadcrumbs")
            .map((block: RenderBlock) => ({
            blockId: block.blockId,
            type: block.type,
            order: block.order,
            parentBlockId: block.parentBlockId,
            props: block.props,
          })),
        }));

  const caseUrlPattern =
    payload.mode === "published"
      ? payload.snapshot.caseUrlPattern
      : payload.site.caseUrlPattern;

  const normalizedPath = pathname === "" ? "/" : pathname.startsWith("/") ? pathname : `/${pathname}`;
  const caseMatch = matchCasePath(caseUrlPattern, normalizedPath);
  if (caseMatch?.publicSlug || caseMatch?.caseNumber) {
    const detailPage = pages.find((page: RenderPage) => page.kind === "case_detail");
    const caseRow = caseRecords?.find((row: { publicSlug: string; caseNumber: number }) =>
      caseMatch.publicSlug
        ? row.publicSlug === caseMatch.publicSlug
        : row.caseNumber === caseMatch.caseNumber,
    );
    if (detailPage && caseRow) {
      return {
        page: detailPage,
        context: withDiscordContext(
          {
            ...siteTemplateFields(payload),
            ...renderFields,
            page: { title: detailPage.title, slug: detailPage.slug },
            pages: navbarContextPages(pages),
            ...buildCaseTemplateContext(caseRecordToPayload(caseRow)),
          },
          discord,
        ),
      };
    }
  }

  const pageSlug = normalizedPath === "/" ? "home" : normalizedPath.slice(1).split("/")[0];
  const page =
    pages.find(
      (entry: RenderPage) => entry.slug === pageSlug && entry.kind !== "protected",
    ) ??
    pages.find(
      (entry: RenderPage) => entry.slug === "home" && entry.kind !== "protected",
    );
  if (!page) return null;

  return {
    page,
    context: withDiscordContext(
      {
        ...siteTemplateFields(payload),
        ...renderFields,
        page: { title: page.title, slug: page.slug },
        pages: navbarContextPages(pages),
        cases: caseRecords?.map((row: Parameters<typeof caseRecordToPayload>[0]) => caseRecordToPayload(row)),
        caseUrlPattern,
      },
      discord,
    ),
  };
}

export function publicSiteDocumentMeta(
  payload: SitePayload,
  pathname: string,
  caseRecords?: CaseRecords,
  discord?: DiscordVisitorContext,
  preview = false,
): { title: string; faviconUrl: string | null } {
  if (!payload) {
    return { title: "Site", faviconUrl: null };
  }
  const view = buildView(payload, pathname, caseRecords, discord, preview);
  return {
    title: resolveSiteDocumentTitle(view?.page.title, payload.site.title),
    faviconUrl: payload.faviconUrl ?? null,
  };
}

export function PublicSitePage({
  pathname,
  payload,
  caseRecords,
  discordVisitor,
  draft = false,
  publicBasePath = "",
}: {
  pathname: string;
  payload: SitePayload;
  caseRecords?: CaseRecords;
  discordVisitor?: Parameters<typeof buildDiscordTemplateContext>[0];
  draft?: boolean;
  publicBasePath?: string;
}) {
  if (!payload) {
    return <p className="p-6 text-sm text-zinc-500">Page not found.</p>;
  }

  const view = buildView(
    payload,
    pathname,
    caseRecords,
    buildDiscordTemplateContext(discordVisitor),
    draft,
  );
  if (!view) {
    return <p className="p-6 text-sm text-zinc-500">Page not found.</p>;
  }

  const theme = payload.mode === "published" ? payload.snapshot.theme : payload.site.theme;
  const navbarStyle =
    payload.mode === "published"
      ? resolveNavbarStyle(payload.snapshot.navbarStyle)
      : resolveNavbarStyle(payload.site.navbarStyle);
  const navbarSource =
    payload.mode === "published" ? payload.snapshot : payload.site;
  const rawNavbarText = resolveNavbarText(navbarSource.navbarText, payload.site.title);
  const blocks: SiteBlock[] = view.page.blocks.map((block: RenderBlock) => ({
    blockId: block.blockId,
    type: block.type as SiteBlock["type"],
    order: block.order,
    parentBlockId: block.parentBlockId,
    props: block.props,
  }));

  return (
    <SiteShell
      title={payload.site.title}
      theme={theme}
      navbarStyle={navbarStyle}
      navbarText={rawNavbarText}
      brandNode={<TemplateText value={rawNavbarText} context={view.context} />}
      navbarMenu={navbarSource.navbarMenu}
      navbarAlign={navbarSource.navbarAlign}
      navbarBrandSide={navbarSource.navbarBrandSide}
      navbarLinkStyle={navbarSource.navbarLinkStyle}
      navbarShowBrand={navbarSource.navbarShowBrand}
      pages={view.context.pages}
      currentSlug={view.page.slug}
      editHref={draft ? pageHref("edit", publicBasePath) : undefined}
      showDockBranding={payload.showDockBranding}
      publicBasePath={publicBasePath}
    >
      {view.page.showBreadcrumbs ? (
        <PageBreadcrumbs
          context={view.context}
          type={view.page.breadcrumbType}
          className="mb-6"
          homeHref={pageHref("home", publicBasePath)}
        />
      ) : null}
      <BlockRenderer blocks={blocks} context={view.context} />
    </SiteShell>
  );
}
