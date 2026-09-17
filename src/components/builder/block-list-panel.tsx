"use client";

import { getBlockEntry } from "@/lib/blocks/registry";
import { BLOCK_ICONS } from "@/lib/blocks/icons";
import { buildBlockTree, type BlockTreeNode } from "@/lib/blocks/tree";
import type { SiteBlock } from "@/lib/blocks/types";

function TreeNode({
  node,
  depth,
  selectedBlockId,
  onSelect,
}: {
  node: BlockTreeNode;
  depth: number;
  selectedBlockId: string | null;
  onSelect: (blockId: string) => void;
}) {
  const entry = getBlockEntry(node.type);
  const label = entry?.definition.label ?? node.type;
  const selected = selectedBlockId === node.blockId;
  const preview =
    typeof node.props.text === "string" && node.props.text.trim()
      ? node.props.text.trim()
      : undefined;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.blockId)}
        className={`flex w-full items-center gap-2 rounded-sm py-1.5 pr-2 text-left text-xs transition-colors ${
          selected
            ? "bg-white/[0.07] text-zinc-100"
            : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <i
          className={`bx ${BLOCK_ICONS[node.type] ?? "bx-cube"} shrink-0 text-sm text-zinc-500`}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">{preview || label}</span>
      </button>
      {node.children.map((child) => (
        <TreeNode
          key={child.blockId}
          node={child}
          depth={depth + 1}
          selectedBlockId={selectedBlockId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function BlockListPanel({
  blocks,
  selectedBlockId,
  onSelectBlock,
}: {
  blocks: SiteBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
}) {
  const tree = buildBlockTree(blocks);

  if (tree.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-zinc-500">No layers on this page yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-px px-2 py-2">
      {tree.map((node) => (
        <TreeNode
          key={node.blockId}
          node={node}
          depth={0}
          selectedBlockId={selectedBlockId}
          onSelect={onSelectBlock}
        />
      ))}
    </div>
  );
}
