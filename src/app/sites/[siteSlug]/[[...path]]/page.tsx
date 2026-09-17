import type { Metadata } from "next";
import {
  PublicSitePage,
  publicSiteDocumentMeta,
} from "@/components/sites/public-site-page";
import { SiteProtectedPage } from "@/components/sites/site-protected-page";
import { buildDiscordTemplateContext } from "@/lib/variables/resolve";
import { loadPublicSitePage } from "../load-site-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string; path?: string[] }>;
}): Promise<Metadata> {
  const { siteSlug, path } = await params;
  const pathname = path?.length ? `/${path.join("/")}` : "/";
  const loaded = await loadPublicSitePage(siteSlug, pathname, false);
  if (loaded.accessDenied) {
    return {
      title: loaded.accessDenied.protectedPageTitle,
      icons: loaded.accessDenied.faviconUrl
        ? {
            icon: loaded.accessDenied.faviconUrl,
            shortcut: loaded.accessDenied.faviconUrl,
            apple: loaded.accessDenied.faviconUrl,
          }
        : undefined,
    };
  }
  if (!loaded.payload) return { title: "Site" };
  const meta = publicSiteDocumentMeta(
    loaded.payload,
    pathname,
    loaded.caseRecords,
    buildDiscordTemplateContext(loaded.discordVisitor),
    false,
    loaded.templateVars,
  );
  return {
    title: { absolute: meta.title },
    icons: meta.faviconUrl
      ? {
          icon: meta.faviconUrl,
          shortcut: meta.faviconUrl,
          apple: meta.faviconUrl,
        }
      : undefined,
  };
}

export default async function PublishedSiteRoute({
  params,
}: {
  params: Promise<{ siteSlug: string; path?: string[] }>;
}) {
  const { siteSlug, path } = await params;
  const pathname = path?.length ? `/${path.join("/")}` : "/";
  const loaded = await loadPublicSitePage(siteSlug, pathname, false);

  if (loaded.accessDenied) {
    return (
      <SiteProtectedPage
        theme={loaded.accessDenied.theme}
        blocks={loaded.accessDenied.protectedPageBlocks}
        context={loaded.accessDenied.renderContext}
        detail={loaded.accessDenied.detail}
        showDockBranding={loaded.accessDenied.showDockBranding}
      />
    );
  }

  return (
    <PublicSitePage
      pathname={pathname}
      payload={loaded.payload}
      caseRecords={loaded.caseRecords}
      templateVars={loaded.templateVars}
      discordVisitor={loaded.discordVisitor}
      publicBasePath={loaded.publicBasePath}
    />
  );
}
