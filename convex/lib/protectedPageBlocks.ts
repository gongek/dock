import {
  DEFAULT_SITE_PROTECTED_PAGE,
  resolveSiteProtectedPage,
  type SiteProtectedPageSettings,
} from "./siteProtectedPage";

export type ProtectedPageSeedBlock = {
  blockId: string;
  type: string;
  order: number;
  parentBlockId?: string;
  props: Record<string, unknown>;
};

export function buildProtectedPageSeedBlocks(
  settings?: SiteProtectedPageSettings | null,
): ProtectedPageSeedBlock[] {
  const resolved = resolveSiteProtectedPage(settings);
  const blocks: ProtectedPageSeedBlock[] = [
    {
      blockId: "protected-heading",
      type: "heading",
      order: 0,
      props: { text: resolved.title, level: 1 },
    },
    {
      blockId: "protected-message",
      type: "text",
      order: 1,
      props: { text: resolved.message },
    },
  ];

  let order = 2;
  if (resolved.showHomeButton) {
    blocks.push({
      blockId: "protected-home",
      type: "button",
      order: order++,
      props: {
        label: resolved.homeButtonLabel,
        href: "/",
        variant: "ghost",
        action: "link",
      },
    });
  }
  if (resolved.showRetryButton) {
    blocks.push({
      blockId: "protected-retry",
      type: "button",
      order: order++,
      props: {
        label: resolved.retryButtonLabel,
        href: "/",
        variant: "ghost",
        action: "reload",
      },
    });
  }

  return blocks;
}

export function protectedPageDocumentTitle(title?: string | null): string {
  return title?.trim() || "Protected page";
}
