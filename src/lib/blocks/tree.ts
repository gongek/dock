import type { SiteBlock } from "./types";

export type BlockTreeNode = SiteBlock & { children: BlockTreeNode[] };

export function isContainerBlock(type: string): boolean {
  return (
    type === "section" ||
    type === "columns" ||
    type === "group" ||
    type === "card" ||
    type === "row"
  );
}

export function isNestableContainer(type: string): boolean {
  return type === "section" || type === "group" || type === "card" || type === "row";
}

export function normalizeParentId(parentBlockId?: string | null): string | undefined {
  return parentBlockId ?? undefined;
}

export function getSiblings(
  blocks: SiteBlock[],
  parentBlockId?: string,
  columnIndex?: number,
): SiteBlock[] {
  const parent = normalizeParentId(parentBlockId);
  return blocks
    .filter((block) => {
      if (normalizeParentId(block.parentBlockId) !== parent) return false;
      if (columnIndex === undefined) return true;
      return Number(block.props.columnIndex ?? 0) === columnIndex;
    })
    .sort((a, b) => a.order - b.order);
}

export function buildBlockTree(blocks: SiteBlock[]): BlockTreeNode[] {
  function build(parentId?: string): BlockTreeNode[] {
    return getSiblings(blocks, parentId).map((block) => ({
      ...block,
      children: build(block.blockId),
    }));
  }
  return build();
}

export function getDescendantIds(blockId: string, blocks: SiteBlock[]): string[] {
  const ids: string[] = [];
  function collect(parentId: string) {
    for (const child of getSiblings(blocks, parentId)) {
      ids.push(child.blockId);
      collect(child.blockId);
    }
  }
  collect(blockId);
  return ids;
}

function reorderSiblings(siblings: SiteBlock[]): SiteBlock[] {
  return siblings.map((block, order) => ({ ...block, order }));
}

export function insertBlockAt(
  blocks: SiteBlock[],
  block: SiteBlock,
  parentBlockId?: string,
  index?: number,
  columnIndex?: number,
): SiteBlock[] {
  const parent = normalizeParentId(parentBlockId);
  const siblings = getSiblings(blocks, parent, columnIndex);
  const insertAt = index ?? siblings.length;
  const newBlock: SiteBlock = {
    ...block,
    parentBlockId: parent,
    order: insertAt,
    props: columnIndex !== undefined
      ? { ...block.props, columnIndex }
      : block.props,
  };

  const updatedSiblings = reorderSiblings([
    ...siblings.slice(0, insertAt),
    newBlock,
    ...siblings.slice(insertAt),
  ]);

  const siblingIds = new Set(siblings.map((s) => s.blockId));
  const others = blocks.filter((b) => !siblingIds.has(b.blockId));
  return [...others, ...updatedSiblings];
}

export function removeBlockAndDescendants(blockId: string, blocks: SiteBlock[]): SiteBlock[] {
  const toRemove = new Set([blockId, ...getDescendantIds(blockId, blocks)]);
  const removed = blocks.find((b) => b.blockId === blockId);
  const remaining = blocks.filter((b) => !toRemove.has(b.blockId));

  if (!removed) return remaining;

  const parent = normalizeParentId(removed.parentBlockId);
  const columnIndex =
    removed.props.columnIndex !== undefined
      ? Number(removed.props.columnIndex)
      : undefined;
  const siblings = getSiblings(remaining, parent, columnIndex);
  const reordered = reorderSiblings(siblings);
  const siblingIds = new Set(siblings.map((s) => s.blockId));
  const others = remaining.filter((b) => !siblingIds.has(b.blockId));
  return [...others, ...reordered];
}

export function moveBlock(
  blocks: SiteBlock[],
  blockId: string,
  targetIndex: number,
  targetParentId?: string,
  columnIndex?: number,
): SiteBlock[] {
  const block = blocks.find((b) => b.blockId === blockId);
  if (!block) return blocks;

  const sourceParent = normalizeParentId(block.parentBlockId);
  const sourceParentBlock = sourceParent
    ? blocks.find((item) => item.blockId === sourceParent)
    : undefined;
  const sourceColumnIndex =
    sourceParentBlock?.type === "columns" && block.props.columnIndex !== undefined
      ? Number(block.props.columnIndex)
      : undefined;
  const sourceSiblings = getSiblings(blocks, sourceParent, sourceColumnIndex);
  const sourceIndex = sourceSiblings.findIndex((item) => item.blockId === blockId);

  const sameList =
    sourceIndex >= 0 &&
    sourceParent === normalizeParentId(targetParentId) &&
    sourceColumnIndex === columnIndex;

  if (sameList && (targetIndex === sourceIndex || targetIndex === sourceIndex + 1)) {
    return blocks;
  }

  let insertIndex = targetIndex;
  if (sameList && targetIndex > sourceIndex) {
    insertIndex = targetIndex - 1;
  }

  const without = removeBlockAndDescendants(blockId, blocks);
  const restProps = { ...block.props };
  if (columnIndex === undefined) {
    delete restProps.columnIndex;
  }
  const moved: SiteBlock = {
    ...block,
    parentBlockId: normalizeParentId(targetParentId),
    props: columnIndex !== undefined ? { ...restProps, columnIndex } : restProps,
  };
  return insertBlockAt(without, moved, targetParentId, insertIndex, columnIndex);
}

export function flattenBlocks(blocks: SiteBlock[]): SiteBlock[] {
  const tree = buildBlockTree(blocks);
  const flat: SiteBlock[] = [];

  function walk(nodes: BlockTreeNode[]) {
    for (const node of nodes) {
      const { children, ...block } = node;
      flat.push(block);
      walk(children);
    }
  }
  walk(tree);
  return flat;
}

export function duplicateBlockSubtree(
  blockId: string,
  blocks: SiteBlock[],
  createId: (type: SiteBlock["type"]) => string,
): SiteBlock[] {
  const block = blocks.find((b) => b.blockId === blockId);
  if (!block) return blocks;

  const idMap = new Map<string, string>();

  function collectIds(id: string) {
    const b = blocks.find((x) => x.blockId === id);
    if (!b) return;
    idMap.set(id, createId(b.type));
    if (b.type === "columns") {
      const count = Number(b.props.count ?? 2);
      for (let col = 0; col < count; col += 1) {
        for (const child of getSiblings(blocks, id, col)) {
          collectIds(child.blockId);
        }
      }
    } else {
      for (const child of getSiblings(blocks, id)) {
        collectIds(child.blockId);
      }
    }
  }
  collectIds(blockId);

  const clones: SiteBlock[] = [];
  function cloneTree(id: string, newParentId?: string) {
    const b = blocks.find((x) => x.blockId === id);
    if (!b) return;
    const newId = idMap.get(id)!;
    clones.push({ ...b, blockId: newId, parentBlockId: newParentId });

    if (b.type === "columns") {
      const count = Number(b.props.count ?? 2);
      for (let col = 0; col < count; col += 1) {
        for (const child of getSiblings(blocks, id, col)) {
          cloneTree(child.blockId, newId);
        }
      }
    } else {
      for (const child of getSiblings(blocks, id)) {
        cloneTree(child.blockId, newId);
      }
    }
  }
  cloneTree(blockId, block.parentBlockId);

  const parent = normalizeParentId(block.parentBlockId);
  const columnIndex =
    block.props.columnIndex !== undefined ? Number(block.props.columnIndex) : undefined;
  const siblings = getSiblings(blocks, parent, columnIndex);
  const insertAt = siblings.findIndex((s) => s.blockId === blockId) + 1;

  let result = blocks;
  const rootClone = clones.find((c) => c.blockId === idMap.get(blockId));
  if (!rootClone) return blocks;
  result = insertBlockAt(result, rootClone, parent, insertAt, columnIndex);

  const nestedClones = clones.filter((c) => c.blockId !== rootClone.blockId);
  return [...result, ...nestedClones.map((c) => ({
    ...c,
    parentBlockId: c.parentBlockId ? idMap.get(c.parentBlockId) ?? c.parentBlockId : c.parentBlockId,
  }))];
}

export function getBlockPath(blockId: string, blocks: SiteBlock[]): SiteBlock[] {
  const path: SiteBlock[] = [];
  let current = blocks.find((b) => b.blockId === blockId);
  while (current) {
    path.unshift(current);
    current = current.parentBlockId
      ? blocks.find((b) => b.blockId === current!.parentBlockId)
      : undefined;
  }
  return path;
}
