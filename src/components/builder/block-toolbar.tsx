"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { getBlockEntry } from "@/lib/blocks/registry";
import type { SiteBlock } from "@/lib/blocks/types";

export function BlockToolbar({
  block,
  onDuplicate,
  onDelete,
  dragAttributes,
  dragListeners,
}: {
  block: SiteBlock;
  onDuplicate: () => void;
  onDelete: () => void;
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
}) {
  const entry = getBlockEntry(block.type);

  return (
    <div className="builder-block-toolbar absolute top-0 left-full z-20 ml-2 flex items-center whitespace-nowrap">
      <button
        type="button"
        className="builder-block-toolbar-btn flex cursor-grab items-center justify-center active:cursor-grabbing"
        title="Drag to reorder"
        aria-label="Drag to reorder"
        {...dragAttributes}
        {...dragListeners}
        onClick={(e) => e.stopPropagation()}
      >
        <i className="bx bx-move text-sm" aria-hidden />
      </button>
      <span className="builder-block-toolbar-label max-w-[180px] truncate">
        {entry?.definition.label ?? block.type}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        className="builder-block-toolbar-btn flex items-center justify-center"
        title="Duplicate"
        aria-label="Duplicate block"
      >
        <i className="bx bx-duplicate text-sm" aria-hidden />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="builder-block-toolbar-btn builder-block-toolbar-btn-danger flex items-center justify-center"
        title="Delete"
        aria-label="Delete block"
      >
        <i className="bx bx-trash text-sm" aria-hidden />
      </button>
    </div>
  );
}
