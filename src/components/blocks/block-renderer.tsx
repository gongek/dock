"use client";

import type { ReactNode } from "react";
import { getBlockEntry } from "@/lib/blocks/registry";
import type { BlockRenderContext, SiteBlock } from "@/lib/blocks/types";
import { getSiblings, isContainerBlock } from "@/lib/blocks/tree";
import { blockLayoutClassName, blockLayoutStyle, readBlockLayout } from "@/lib/blocks/layout";

function LayoutWrap({
  block,
  children,
}: {
  block: SiteBlock;
  children: ReactNode;
}) {
  const layout = readBlockLayout(block.props);
  return (
    <div
      className={blockLayoutClassName(block.props)}
      style={{
        ...blockLayoutStyle(block.props),
        overflow: layout.height ? "hidden" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function renderBlockNode(
  block: SiteBlock,
  allBlocks: SiteBlock[],
  context: BlockRenderContext,
): ReactNode {
  const entry = getBlockEntry(block.type);
  if (!entry) return null;

  const props = { ...block.props, _blockId: block.blockId };

  if (isContainerBlock(block.type) && block.type === "columns") {
    const count = Number(block.props.count ?? 2);
    const columnChildren = [];
    for (let col = 0; col < count; col += 1) {
      const colBlocks = getSiblings(allBlocks, block.blockId, col);
      columnChildren.push(
        <div key={col} className="flex min-w-0 flex-col gap-3">
          {colBlocks.map((child) => (
            <LayoutWrap key={child.blockId} block={child}>
              {renderBlockNode(child, allBlocks, context)}
            </LayoutWrap>
          ))}
        </div>,
      );
    }
    return entry.render(props, context, columnChildren);
  }

  if (isContainerBlock(block.type)) {
    const children = getSiblings(allBlocks, block.blockId).map((child) => (
      <LayoutWrap key={child.blockId} block={child}>
        {renderBlockNode(child, allBlocks, context)}
      </LayoutWrap>
    ));
    return entry.render(props, context, children);
  }

  return entry.render(props, context);
}

export function BlockRenderer({
  blocks,
  context,
}: {
  blocks: SiteBlock[];
  context: BlockRenderContext;
}) {
  const rootBlocks = getSiblings(blocks);
  return (
    <div className="flex flex-col gap-6">
      {rootBlocks.map((block) => (
        <LayoutWrap key={block.blockId} block={block}>
          {renderBlockNode(block, blocks, context)}
        </LayoutWrap>
      ))}
    </div>
  );
}
