import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetchAction, fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { SITE_DISCORD_USER_COOKIE } from "@/lib/site-discord-auth";
import { isProtectedPageAccess, buildSiteDiscordAuthUrl, resolveDiscordScopesForPageAccess } from "@/lib/page-access";
import {
  isMainDockHost,
  PUBLIC_SITE_BASE_HEADER,
} from "@/lib/site-host";
import type { ResolvedSiteProtectedPage } from "@/lib/site-protected-page";
import type { BlockRenderContext } from "@/lib/blocks/types";
import {
  buildBotTemplateContext,
  buildDiscordTemplateContext,
} from "@/lib/variables/resolve";

type SiteTheme = {
  background?: string;
  foreground?: string;
  surface?: string;
  accent?: string;
};

export type PageAccessDenied = {
  kind: "denied";
  detail?: string;
  slug: string;
  code?: string;
  siteTitle: string;
  theme: SiteTheme;
  protectedPage: ResolvedSiteProtectedPage;
  protectedPageTitle: string;
  protectedPageBlocks: Array<{
    blockId: string;
    type: string;
    order: number;
    parentBlockId?: string;
    props: Record<string, unknown>;
  }>;
  renderContext: BlockRenderContext;
  showDockBranding: boolean;
  faviconUrl: string | null;
};

export type PublicSitePageLoadResult = {
  payload: FunctionReturnType<typeof api.sites.getPublishedSiteBySlug> | null;
  caseRecords: FunctionReturnType<typeof api.siteCases.listCaseRecords> | undefined;
  pathname: string;
  discordVisitor: Awaited<ReturnType<typeof loadDiscordVisitor>>;
  publicBasePath: string;
  accessDenied?: PageAccessDenied;
};

export async function loadDiscordVisitor() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const discordUserId =
    cookieStore.get(SITE_DISCORD_USER_COOKIE)?.value?.trim() ||
    headerStore.get("x-dock-discord-user")?.trim() ||
    undefined;
  if (!discordUserId) return undefined;
  const session = await fetchQuery(api.siteDiscordAuthQueries.getDiscordSession, {
    discordUserId,
  });
  if (!session) return undefined;
  return {
    id: session.discordUserId,
    username: session.username,
    globalName: session.globalName,
    avatarUrl: session.avatarUrl,
  };
}

export async function readPublicSiteBasePath(siteSlug: string): Promise<string> {
  const headerStore = await headers();
  const fromMiddleware = headerStore.get(PUBLIC_SITE_BASE_HEADER);
  if (fromMiddleware !== null) return fromMiddleware;

  const host = (
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    ""
  )
    .split(":")[0]
    ?.toLowerCase();
  if (isMainDockHost(host ?? "")) {
    return `/sites/${siteSlug}`;
  }
  return "";
}

async function buildOAuthReturnTo(pathname: string): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  const basePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${protocol}://${host}${basePath}`;
}

export async function loadPublicSitePage(
  siteSlug: string,
  pathname: string,
  draft: boolean,
): Promise<PublicSitePageLoadResult> {
  const accessContext = await fetchQuery(api.pageAccessQueries.getPageAccessContext, {
    siteSlug,
    pathname,
    draft,
  });

  const cookieStore = await cookies();
  const discordUserId = cookieStore.get(SITE_DISCORD_USER_COOKIE)?.value?.trim();
  const publicBasePath = await readPublicSiteBasePath(siteSlug);

  if (!accessContext) {
    return {
      payload: null,
      caseRecords: undefined,
      pathname,
      discordVisitor: undefined,
      publicBasePath,
    };
  }

  const pageAccessSettings = accessContext.pageAccessSettings;
  const targetPageSlug = accessContext.targetPageSlug;

  if (isProtectedPageAccess(pageAccessSettings) && targetPageSlug) {
    const oauthScopes = resolveDiscordScopesForPageAccess(pageAccessSettings);
    if (!discordUserId) {
      const returnTo = await buildOAuthReturnTo(
        publicBasePath ? `${publicBasePath}${pathname === "/" ? "" : pathname}` : pathname,
      );
      redirect(buildSiteDiscordAuthUrl({ slug: siteSlug, returnTo, scopes: oauthScopes }));
    }

    const access = await fetchAction(api.pageAccessActions.checkPageAccess, {
      siteSlug,
      pageSlug: targetPageSlug,
      discordUserId,
      draft,
    });

    if (!access.allowed) {
      if (access.code === "reauth") {
        const returnTo = await buildOAuthReturnTo(
          publicBasePath ? `${publicBasePath}${pathname === "/" ? "" : pathname}` : pathname,
        );
        redirect(buildSiteDiscordAuthUrl({ slug: siteSlug, returnTo, scopes: oauthScopes }));
      }

      const discordVisitor = await loadDiscordVisitor();

      const presentation = accessContext.presentation;

      return {
        payload: null,
        caseRecords: undefined,
        pathname,
        discordVisitor,
        publicBasePath,
        accessDenied: {
          kind: "denied",
          detail: access.reason ?? "You do not have access to this page.",
          slug: siteSlug,
          code: access.code,
          siteTitle: presentation.siteTitle,
          theme: presentation.theme,
          protectedPage: presentation.protectedPage,
          protectedPageTitle: presentation.protectedPageTitle,
          protectedPageBlocks: presentation.protectedPageBlocks,
          renderContext: {
            site: { title: presentation.siteTitle, slug: siteSlug },
            bot: buildBotTemplateContext({
              id: accessContext.site.meridianBotId,
              name: presentation.siteTitle,
            }),
            mode: "public",
            resolveVariables: true,
            pages: presentation.navPages,
            ...buildDiscordTemplateContext(discordVisitor),
          },
          showDockBranding: presentation.showDockBranding,
          faviconUrl: presentation.faviconUrl,
        },
      };
    }
  }

  const payload = await fetchQuery(api.sites.getPublishedSiteBySlug, {
    slug: siteSlug,
    draft,
  });
  const caseRecords = payload?.site._id
    ? await fetchQuery(api.siteCases.listCaseRecords, {
        siteId: payload.site._id,
      })
    : undefined;
  const discordVisitor = await loadDiscordVisitor();

  return {
    payload,
    caseRecords,
    pathname,
    discordVisitor,
    publicBasePath,
  };
}
