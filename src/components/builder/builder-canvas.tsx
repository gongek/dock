"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { getBlockEntry } from "@/lib/blocks/registry";
import type { BlockRenderContext, SiteBlock } from "@/lib/blocks/types";
import {
  getSiblings,
  isContainerBlock,
  isNestableContainer,
  normalizeParentId,
} from "@/lib/blocks/tree";
import { BlockResizeHandles } from "@/components/builder/block-resize-handles";
import { BlockToolbar } from "@/components/builder/block-toolbar";
import { blockLayoutClassName, blockLayoutStyle } from "@/lib/blocks/layout";
import { PageBreadcrumbs, type BreadcrumbType } from "@/components/blocks/page-breadcrumbs";
import { SiteShell } from "@/components/sites/site-shell";
import { resolveNavbarText } from "@/lib/sites/navbar";
import { TemplateText } from "@/lib/variables/template-text";
import type {
  NavbarAlign,
  NavbarBrandSide,
  NavbarLayoutPreview,
  NavbarLinkStyle,
  NavbarMenu,
  NavbarStyle,
} from "@/lib/sites/navbar";
import type { NavbarPageLink } from "@/lib/sites/navbar";

const PREVIEW_MAX_WIDTH = 1280;

export type DropZoneData = {
  source: "dropzone";
  parentBlockId?: string;
  columnIndex?: number;
  index: number;
};

export type DropPreview = {
  parentBlockId?: string;
  columnIndex?: number;
  index: number;
  mode: "line" | "nest";
};

const INSERTION_LINE_CLASS =
  "pointer-events-none absolute inset-x-3 z-20 h-0.5 -translate-y-1/2 bg-[#00bcff]";

function dropZonesMatch(zone: DropZoneData, preview: DropPreview | null | undefined): boolean {
  if (!preview || preview.mode !== "line") return false;
  return (
    normalizeParentId(zone.parentBlockId) === normalizeParentId(preview.parentBlockId) &&
    zone.columnIndex === preview.columnIndex &&
    zone.index === preview.index
  );
}

function ColumnSlot({
  parentBlockId,
  columnIndex,
  itemCount,
  isDragging,
  children,
}: {
  parentBlockId: string;
  columnIndex: number;
  itemCount: number;
  isDragging: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-slot-${parentBlockId}-${columnIndex}`,
    data: {
      source: "column-slot",
      parentBlockId,
      columnIndex,
      index: itemCount,
    },
  });
  const empty = itemCount === 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-[160px] min-w-0 flex-col rounded-xl px-4 py-4 transition-colors ${
        isOver
          ? "builder-drop-slot-active outline outline-1 outline-dashed"
          : "rounded-xl outline outline-1 outline-dashed outline-white/[0.09]"
      }`}
    >
      {empty ? (
        <p className="pointer-events-none m-auto px-2 py-6 text-center text-[11px] text-zinc-600">
          {isDragging ? "Drop here" : "Drop blocks here"}
        </p>
      ) : (
        <div className="min-w-0 flex-1">{children}</div>
      )}
    </div>
  );
}

function ContainerSlot({
  parentBlockId,
  isDragging,
}: {
  parentBlockId: string;
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `container-slot-${parentBlockId}`,
    data: {
      source: "dropzone",
      parentBlockId,
      index: 0,
    } satisfies DropZoneData,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[120px] w-full min-w-0 flex-col rounded-xl px-3 py-3 transition-colors ${
        isOver
          ? "builder-drop-slot-active outline outline-1 outline-dashed"
          : "rounded-xl outline outline-1 outline-dashed outline-white/[0.09]"
      }`}
    >
      <p className="pointer-events-none m-auto px-2 py-6 text-center text-[11px] text-zinc-600">
        {isDragging ? "Drop here" : "Drop blocks here"}
      </p>
    </div>
  );
}

export type CanvasDragData = {
  source: "canvas";
  blockId: string;
};

function CanvasDropZone({
  dropId,
  data,
  active,
  dropPreview,
}: {
  dropId: string;
  data: DropZoneData;
  active: boolean;
  dropPreview?: DropPreview | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId, data });
  const showIndicator = active && (isOver || dropZonesMatch(data, dropPreview));

  return (
    <div className="relative h-0">
      <div
        ref={setNodeRef}
        className={`absolute inset-x-0 z-10 h-8 -translate-y-1/2 ${active ? "" : "pointer-events-none"}`}
      />
      {showIndicator ? <div className={INSERTION_LINE_CLASS} /> : null}
    </div>
  );
}

function PreviewStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full w-full justify-center p-4 sm:p-6">
      <div
        className="flex w-full min-w-0 flex-1 flex-col"
        style={{ maxWidth: PREVIEW_MAX_WIDTH }}
      >
        {children}
      </div>
    </div>
  );
}

function SortableCanvasBlock({
  block,
  blocks,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
  onUpdateProps,
  mediaUrlMap,
  context,
  isDragging,
  renderChildren,
  layoutProps,
  onDraft,
}: {
  block: SiteBlock;
  blocks: SiteBlock[];
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdateProps: (props: Record<string, unknown>) => void;
  mediaUrlMap: Map<string, string>;
  context: BlockRenderContext;
  isDragging: boolean;
  renderChildren: (parentId: string, columnIndex?: number) => React.ReactNode;
  layoutProps: Record<string, unknown>;
  onDraft: (nextProps: Record<string, unknown> | null) => void;
}) {
  const entry = getBlockEntry(block.type);
  const isEditing = context.editingBlockId === block.blockId;
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging: isSortableDragging,
    isOver,
  } = useSortable({
    id: block.blockId,
    disabled: isEditing,
    data: { source: "canvas", blockId: block.blockId },
  });
  const blockRef = useRef<HTMLDivElement | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    if (isSortableDragging) draggedRef.current = true;
  }, [isSortableDragging]);

  const setBlockNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      blockRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  if (!entry) return null;

  const props = { ...layoutProps, _blockId: block.blockId };
  const isContainer = isContainerBlock(block.type);
  const showNestHint =
    isDragging &&
    isOver &&
    !isSortableDragging &&
    isNestableContainer(block.type);

  let content: React.ReactNode;
  if (block.type === "columns") {
    const count = Number(block.props.count ?? 2);
    const columnChildren = [];
    for (let col = 0; col < count; col += 1) {
      const itemCount = getSiblings(blocks, block.blockId, col).length;
      columnChildren.push(
        <ColumnSlot
          key={col}
          parentBlockId={block.blockId}
          columnIndex={col}
          itemCount={itemCount}
          isDragging={isDragging}
        >
          {renderChildren(block.blockId, col)}
        </ColumnSlot>,
      );
    }
    content = entry.render(props, context, columnChildren);
  } else if (isContainer) {
    const itemCount = getSiblings(blocks, block.blockId).length;
    content = entry.render(
      props,
      context,
      itemCount === 0 ? (
        <ContainerSlot parentBlockId={block.blockId} isDragging={isDragging} />
      ) : (
        renderChildren(block.blockId)
      ),
    );
  } else {
    content = entry.render(props, context);
  }

  return (
    <div
      ref={setBlockNodeRef}
      {...(!isEditing ? attributes : {})}
      {...(!isEditing ? listeners : {})}
      className={`builder-block relative h-full w-full min-w-0 ${
        isSortableDragging ? "z-10 opacity-40" : selected ? "z-20" : ""
      } ${!isEditing ? "cursor-default" : ""} ${isSortableDragging ? "cursor-grabbing" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        onSelect();
      }}
    >
      {selected ? (
        <>
          <BlockToolbar
            block={block}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            dragAttributes={attributes}
            dragListeners={listeners}
          />
          <BlockResizeHandles
            blockRef={blockRef}
            props={layoutProps}
            onDraft={onDraft}
            onCommit={(nextProps) => {
              onDraft(null);
              onUpdateProps(nextProps);
            }}
          />
        </>
      ) : null}

      <div
        className={`h-full w-full min-w-0 ${Number(layoutProps.boxHeight) > 0 ? "overflow-hidden" : ""} ${isContainer ? "" : "pointer-events-auto"} ${
          selected
            ? "builder-block-selected"
            : showNestHint
              ? "builder-block-nest-hint"
              : "builder-block-hoverable"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function CanvasBlockSlot({
  block,
  blocks,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
  onUpdateProps,
  mediaUrlMap,
  context,
  isDragging,
  renderChildren,
  dropId,
  dropData,
  dropPreview,
}: {
  block: SiteBlock;
  blocks: SiteBlock[];
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdateProps: (props: Record<string, unknown>) => void;
  mediaUrlMap: Map<string, string>;
  context: BlockRenderContext;
  isDragging: boolean;
  renderChildren: (parentId: string, columnIndex?: number) => React.ReactNode;
  dropId: string;
  dropData: DropZoneData;
  dropPreview?: DropPreview | null;
}) {
  const [draftProps, setDraftProps] = useState<Record<string, unknown> | null>(null);
  const layoutProps = draftProps ?? block.props;

  useEffect(() => {
    setDraftProps(null);
  }, [block.props]);

  return (
    <div
      className={blockLayoutClassName(layoutProps)}
      style={blockLayoutStyle(layoutProps)}
    >
      <CanvasDropZone
        dropId={dropId}
        data={dropData}
        active={isDragging}
        dropPreview={dropPreview}
      />
      <SortableCanvasBlock
        block={block}
        blocks={blocks}
        selected={selected}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onUpdateProps={onUpdateProps}
        mediaUrlMap={mediaUrlMap}
        context={context}
        isDragging={isDragging}
        renderChildren={renderChildren}
        layoutProps={layoutProps}
        onDraft={setDraftProps}
      />
    </div>
  );
}

function BlockList({
  blocks,
  parentBlockId,
  columnIndex,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onUpdateBlockProps,
  mediaUrlMap,
  context,
  isDragging,
  dropPreview,
  renderChildren,
}: {
  blocks: SiteBlock[];
  parentBlockId?: string;
  columnIndex?: number;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onUpdateBlockProps: (blockId: string, props: Record<string, unknown>) => void;
  mediaUrlMap: Map<string, string>;
  context: BlockRenderContext;
  isDragging: boolean;
  dropPreview?: DropPreview | null;
  renderChildren: (parentId: string, columnIndex?: number) => React.ReactNode;
}) {
  const siblings = getSiblings(blocks, parentBlockId, columnIndex);
  const blockIds = siblings.map((b) => b.blockId);
  const parentKey = parentBlockId ?? "root";
  const colKey = columnIndex !== undefined ? `-col${columnIndex}` : "";

  return (
    <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
      <div className={`builder-block-list flex flex-col ${parentBlockId ? "gap-3" : "gap-6"}`}>
        {siblings.map((block, index) => (
          <CanvasBlockSlot
            key={block.blockId}
            block={block}
            blocks={blocks}
            selected={selectedBlockId === block.blockId}
            onSelect={() => onSelectBlock(block.blockId)}
            onDelete={() => onDeleteBlock(block.blockId)}
            onDuplicate={() => onDuplicateBlock(block.blockId)}
            onUpdateProps={(props) => onUpdateBlockProps(block.blockId, props)}
            mediaUrlMap={mediaUrlMap}
            context={context}
            isDragging={isDragging}
            renderChildren={renderChildren}
            dropId={`drop-${parentKey}${colKey}-${index}`}
            dropData={{
              source: "dropzone",
              parentBlockId,
              columnIndex,
              index,
            }}
            dropPreview={dropPreview}
          />
        ))}
        <CanvasDropZone
          dropId={`drop-${parentKey}${colKey}-${siblings.length}`}
          data={{
            source: "dropzone",
            parentBlockId,
            columnIndex,
            index: siblings.length,
          }}
          active={isDragging}
          dropPreview={dropPreview}
        />
      </div>
    </SortableContext>
  );
}

export function BuilderCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onUpdateBlockProps,
  onClearSelection,
  context,
  isDragging,
  dropPreview = null,
  mediaUrlMap,
  showBreadcrumbs = false,
  breadcrumbType = "minimal",
  navbarStyle = "default",
  navbarText,
  navbarMenu,
  navbarAlign,
  navbarBrandSide,
  navbarLayoutPreview,
  navbarLinkStyle,
  navbarShowBrand,
  navbarPages = [],
  currentSlug,
  showDockBranding = true,
  protectedPreview = false,
  theme,
}: {
  blocks: SiteBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onUpdateBlockProps: (blockId: string, props: Record<string, unknown>) => void;
  onClearSelection: () => void;
  context: BlockRenderContext;
  isDragging: boolean;
  dropPreview?: DropPreview | null;
  mediaUrlMap: Map<string, string>;
  showBreadcrumbs?: boolean;
  breadcrumbType?: BreadcrumbType;
  navbarStyle?: NavbarStyle;
  navbarText?: string;
  navbarMenu?: NavbarMenu;
  navbarAlign?: NavbarAlign;
  navbarBrandSide?: NavbarBrandSide;
  navbarLayoutPreview?: NavbarLayoutPreview | null;
  navbarLinkStyle?: NavbarLinkStyle;
  navbarShowBrand?: boolean;
  navbarPages?: NavbarPageLink[];
  currentSlug?: string;
  showDockBranding?: boolean;
  protectedPreview?: boolean;
  theme?: {
    background?: string;
    foreground?: string;
    surface?: string;
    accent?: string;
  };
}) {
  const { setNodeRef: setDropAreaRef, isOver: isOverDropArea } = useDroppable({
    id: "canvas-drop-area",
    data: { source: "canvas-drop-area" },
  });
  const { setNodeRef: setCardRef, isOver: isOverCard } = useDroppable({
    id: "canvas-card",
    data: { source: "canvas-card" },
  });

  const rootBlocks = getSiblings(blocks);
  const showEmptyDrop = isDragging && isOverDropArea && rootBlocks.length === 0;

  const pageContent =
    rootBlocks.length === 0 ? (
      <div
        className={`flex min-h-[480px] flex-1 flex-col items-center justify-center px-6 text-center transition-colors ${
          showEmptyDrop ? "builder-empty-drop-active" : ""
        }`}
      >
        <span
          className="flex size-12 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--site-foreground,#ededed)_12%,transparent)] text-[var(--site-accent,#a1a1aa)]"
        >
          <i className="bx bx-plus text-xl" aria-hidden />
        </span>
        <p className="mt-4 text-sm font-medium text-[var(--site-foreground,#ededed)]">
          This page is empty
        </p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-[color-mix(in_srgb,var(--site-foreground,#ededed)_55%,transparent)]">
          Drag from Insert or click a block to add it to the page.
        </p>
      </div>
    ) : (
      <BlockList
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onSelectBlock={onSelectBlock}
        onDeleteBlock={onDeleteBlock}
        onDuplicateBlock={onDuplicateBlock}
        onUpdateBlockProps={onUpdateBlockProps}
        mediaUrlMap={mediaUrlMap}
        context={context}
        isDragging={isDragging}
        dropPreview={dropPreview}
        renderChildren={renderChildren}
      />
    );

  function renderChildren(parentId: string, columnIndex?: number) {
    return (
      <BlockList
        blocks={blocks}
        parentBlockId={parentId}
        columnIndex={columnIndex}
        selectedBlockId={selectedBlockId}
        onSelectBlock={onSelectBlock}
        onDeleteBlock={onDeleteBlock}
        onDuplicateBlock={onDuplicateBlock}
        onUpdateBlockProps={onUpdateBlockProps}
        mediaUrlMap={mediaUrlMap}
        context={context}
        isDragging={isDragging}
        dropPreview={dropPreview}
        renderChildren={renderChildren}
      />
    );
  }

  return (
    <div
      className="site-builder-canvas site-builder-scroll min-h-0 flex-1 overflow-y-auto"
      onClick={onClearSelection}
    >
      <div ref={setDropAreaRef} className="flex min-h-full w-full">
        <PreviewStage>
          <div
            ref={setCardRef}
            className={`flex min-h-full flex-col ${
              showEmptyDrop
                ? "builder-drop-target-active"
                : isDragging && isOverCard
                  ? "rounded-xl shadow-[0_0_0_1px_color-mix(in_srgb,var(--site-accent,#a1a1aa)_40%,transparent)]"
                  : ""
            }`}
          >
            <SiteShell
              title={context.site?.title ?? "Site"}
              theme={theme}
              navbarStyle={navbarStyle}
              navbarText={navbarText}
              brandNode={
                <TemplateText
                  value={resolveNavbarText(navbarText, context.site?.title ?? "Site")}
                  context={context}
                />
              }
              navbarMenu={navbarMenu}
              navbarAlign={navbarAlign}
              navbarBrandSide={navbarBrandSide}
              navbarLayoutPreview={navbarLayoutPreview}
              navbarLinkStyle={navbarLinkStyle}
              navbarShowBrand={navbarShowBrand}
              pages={navbarPages}
              currentSlug={currentSlug}
              interactive={false}
              onNavbarClick={onClearSelection}
              showDockBranding={showDockBranding}
            >
              {showBreadcrumbs ? (
                <PageBreadcrumbs
                  context={context}
                  type={breadcrumbType}
                  className="mb-6"
                />
              ) : null}
              {protectedPreview ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
                  <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--site-surface)]/80 px-6 py-8 text-center shadow-sm">
                    {pageContent}
                  </div>
                </div>
              ) : (
                pageContent
              )}
            </SiteShell>
          </div>
        </PreviewStage>
      </div>
    </div>
  );
}
