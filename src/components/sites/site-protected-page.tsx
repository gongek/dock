"use client";

import type { BlockRenderContext } from "@/lib/blocks/types";
import type { SiteBlock } from "@/lib/blocks/types";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { PoweredByDock } from "@/components/sites/powered-by-dock";

type ProtectedPageBlock = {
  blockId: string;
  type: string;
  order: number;
  parentBlockId?: string;
  props: Record<string, unknown>;
};

export function SiteProtectedPage({
  theme,
  blocks,
  context,
  detail,
  showDockBranding = true,
}: {
  theme?: {
    background?: string;
    foreground?: string;
    surface?: string;
    accent?: string;
  };
  blocks?: ProtectedPageBlock[];
  context?: BlockRenderContext;
  detail?: string;
  showDockBranding?: boolean;
}) {
  const style = {
    ["--site-background" as string]: theme?.background ?? "#090909",
    ["--site-foreground" as string]: theme?.foreground ?? "#ededed",
    ["--site-surface" as string]: theme?.surface ?? "#18181b",
    ["--site-accent" as string]: theme?.accent ?? "#a1a1aa",
  };

  const renderContext: BlockRenderContext = context ?? {
    site: { title: "Site", slug: "" },
    mode: "public",
    resolveVariables: true,
  };

  const siteBlocks: SiteBlock[] =
    blocks?.map((block) => ({
      blockId: block.blockId,
      type: block.type as SiteBlock["type"],
      order: block.order,
      parentBlockId: block.parentBlockId,
      props: block.props,
    })) ?? [];

  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-[var(--site-background)] text-[var(--site-foreground)]"
      style={style}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--site-surface)]/80 px-6 py-8 text-center shadow-sm">
          {siteBlocks.length > 0 ? (
            <BlockRenderer blocks={siteBlocks} context={renderContext} />
          ) : null}
          {detail ? (
            <p
              className={`text-xs leading-5 text-[var(--site-accent)]/80 ${
                siteBlocks.length > 0 ? "mt-3" : ""
              }`}
            >
              {detail}
            </p>
          ) : null}
        </div>
      </div>
      {showDockBranding ? (
        <div className="pb-6">
          <PoweredByDock />
        </div>
      ) : null}
    </div>
  );
}
