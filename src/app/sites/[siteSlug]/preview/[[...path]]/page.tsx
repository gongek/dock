import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PublicSitePage,
  publicSiteDocumentMeta,
} from "@/components/sites/public-site-page";
import { SiteProtectedPage } from "@/components/sites/site-protected-page";
import { buildDiscordTemplateContext } from "@/lib/variables/resolve";
import { loadPublicSitePage } from "../../load-site-page";

export const dynamic = "force-dynamic";

function assertDevPreview() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
}

function previewPathname(path?: string[]) {
  return path?.length ? `/${path.join("/")}` : "/";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string; path?: string[] }>;
}): Promise<Metadata> {
  assertDevPreview();
  const { siteSlug, path } = await params;
  const pathname = previewPathname(path);
  const loaded = await loadPublicSitePage(siteSlug, pathname, true);
  if (loaded.accessDenied) {
    return {
      title: `Preview · ${loaded.accessDenied.protectedPageTitle}`,
      robots: { index: false, follow: false },
    };
  }
  if (!loaded.payload) return { title: "Preview" };
  const meta = publicSiteDocumentMeta(
    loaded.payload,
    pathname,
    loaded.caseRecords,
    buildDiscordTemplateContext(loaded.discordVisitor),
    true,
  );
  return {
    title: { absolute: `Preview · ${meta.title}` },
    icons: meta.faviconUrl
      ? {
          icon: meta.faviconUrl,
          shortcut: meta.faviconUrl,
          apple: meta.faviconUrl,
        }
      : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function SitePreviewRoute({
  params,
}: {
  params: Promise<{ siteSlug: string; path?: string[] }>;
}) {
  assertDevPreview();
  const { siteSlug, path } = await params;
  const pathname = previewPathname(path);
  const loaded = await loadPublicSitePage(siteSlug, pathname, true);

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
      discordVisitor={loaded.discordVisitor}
      draft
      publicBasePath={loaded.publicBasePath}
    />
  );
}
