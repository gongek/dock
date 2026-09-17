"use client";

import "boxicons/css/boxicons.min.css";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  BuilderCanvas,
  type DropPreview,
  type DropZoneData,
} from "@/components/builder/builder-canvas";
import {
  ElementsSidebar,
  PaletteDragOverlay,
  type SidebarTab,
} from "@/components/builder/elements-sidebar";
import { InspectorPanel } from "@/components/builder/inspector-panel";
import { PageSwitcher } from "@/components/builder/page-switcher";
import { useUndoRedo } from "@/components/builder/use-undo-redo";
import { getBlockEntry } from "@/lib/blocks/registry";
import { BLOCK_PATTERNS, type PatternNode } from "@/lib/blocks/patterns";
import { applyCellField } from "@/lib/blocks/table";
import type { SiteBlock } from "@/lib/blocks/types";
import { createBlockId } from "@/lib/blocks/types";
import { buildSiteOrigin } from "@/lib/site-host";
import { userFacingError } from "@/lib/user-facing-error";
import type { BreadcrumbType } from "@/components/blocks/page-breadcrumbs";
import {
  pageAppearsInNavbar,
  resolveNavbarSettings,
  type NavbarLayoutPreview,
  type NavbarSettings,
} from "@/lib/sites/navbar";
import Link from "next/link";
import {
  SiteSettingsDialog,
  type SiteSettingsSite,
} from "@/components/builder/site-settings-dialog";
import { ConfirmMenu } from "@/components/ui/confirm-menu";
import {
  duplicateBlockSubtree,
  getDescendantIds,
  getSiblings,
  insertBlockAt,
  isNestableContainer,
  moveBlock,
  normalizeParentId,
  removeBlockAndDescendants,
} from "@/lib/blocks/tree";
import { buildBotTemplateContext } from "@/lib/variables/resolve";
import {
  resolvePageAccessSettings,
  type PageAccessSettings,
} from "@/lib/page-access";

type DragSource =
  | { source: "palette"; blockType: string }
  | { source: "pattern"; patternId: string }
  | { source: "canvas"; blockId: string }
  | DropZoneData
  | { source: "column-slot"; parentBlockId: string; columnIndex: number; index: number }
  | { source: "canvas-drop-area" }
  | { source: "canvas-card" };

const AUTO_SAVE_MS = 800;

function mapRemoteBlocks(
  remoteBlocks: Array<{
    blockId: string;
    type: string;
    order: number;
    parentBlockId?: string;
    props: Record<string, unknown>;
  }>,
): SiteBlock[] {
  return remoteBlocks
    .filter((block) => block.type !== "breadcrumbs")
    .map((block) => ({
      blockId: block.blockId,
      type: block.type as SiteBlock["type"],
      order: block.order,
      parentBlockId: block.parentBlockId,
      props: block.props,
    }));
}

const DROP_SOURCE_RANK: Record<string, number> = {
  dropzone: 0,
  "column-slot": 1,
  canvas: 2,
  "canvas-drop-area": 3,
  "canvas-card": 4,
};

const preferSpecificCollisions: CollisionDetection = (args) => {
  const collisions = pointerWithin(args);
  if (collisions.length <= 1) return collisions;

  return [...collisions].sort((a, b) => {
    const aSource = (a.data?.droppableContainer?.data.current as DragSource | undefined)?.source;
    const bSource = (b.data?.droppableContainer?.data.current as DragSource | undefined)?.source;
    return (DROP_SOURCE_RANK[aSource ?? ""] ?? 5) - (DROP_SOURCE_RANK[bSource ?? ""] ?? 5);
  });
};

function pointerYFromEvent(event: DragEndEvent | DragOverEvent): number | undefined {
  const activator = event.activatorEvent;
  if (activator && "clientY" in activator && typeof activator.clientY === "number") {
    return activator.clientY + event.delta.y;
  }
  return undefined;
}

function getDropPreviewMode(
  overData: DragSource | undefined,
  blocks: SiteBlock[],
  overRect?: { top: number; height: number } | null,
  pointerY?: number,
): DropPreview["mode"] {
  if (overData?.source !== "canvas" || !overRect || pointerY === undefined) {
    return "line";
  }
  const hovered = blocks.find((block) => block.blockId === overData.blockId);
  if (!hovered || !isNestableContainer(hovered.type)) return "line";
  const rel = (pointerY - overRect.top) / (overRect.height || 1);
  return rel > 0.2 && rel < 0.8 ? "nest" : "line";
}

function getDropTarget(
  overData: DragSource | undefined,
  blocks: SiteBlock[],
  rootBlockCount: number,
  overRect?: { top: number; height: number } | null,
  pointerY?: number,
): {
  parentBlockId?: string;
  columnIndex?: number;
  index: number;
} {
  if (!overData) return { index: rootBlockCount };
  if (overData.source === "dropzone" || overData.source === "column-slot") {
    return {
      parentBlockId: overData.parentBlockId,
      columnIndex: overData.columnIndex,
      index: overData.index,
    };
  }
  if (overData.source === "canvas") {
    const hovered = blocks.find((block) => block.blockId === overData.blockId);
    if (!hovered) return { index: rootBlockCount };

    const parent = normalizeParentId(hovered.parentBlockId);
    const parentBlock = parent ? blocks.find((block) => block.blockId === parent) : undefined;
    const columnIndex =
      parentBlock?.type === "columns" && hovered.props.columnIndex !== undefined
        ? Number(hovered.props.columnIndex)
        : undefined;
    const siblings = getSiblings(blocks, parent, columnIndex);
    const index = siblings.findIndex((block) => block.blockId === hovered.blockId);
    if (index < 0) return { index: rootBlockCount };

    const nestable = isNestableContainer(hovered.type);
    if (overRect && pointerY !== undefined) {
      const rel = (pointerY - overRect.top) / (overRect.height || 1);
      if (nestable && rel > 0.2 && rel < 0.8) {
        return {
          parentBlockId: hovered.blockId,
          index: getSiblings(blocks, hovered.blockId).length,
        };
      }
      return {
        parentBlockId: parent,
        columnIndex,
        index: rel >= 0.5 ? index + 1 : index,
      };
    }

    return {
      parentBlockId: parent,
      columnIndex,
      index: index + 1,
    };
  }
  if (overData.source === "canvas-drop-area" || overData.source === "canvas-card") {
    return { index: rootBlockCount };
  }
  return { index: rootBlockCount };
}

export function SiteBuilder({
  siteId,
  site,
  siteTitle,
  siteSlug,
  hostKind: _hostKind,
  meridianBotId,
  botName,
  linkedGuildId,
  caseUrlPattern: siteCaseUrlPattern,
  pages,
  initialPageId,
  onReady,
  navbarStyle: initialNavbarStyle,
  navbarText: initialNavbarText,
  navbarMenu: initialNavbarMenu,
  navbarAlign: initialNavbarAlign,
  navbarBrandSide: initialNavbarBrandSide,
  navbarLinkStyle: initialNavbarLinkStyle,
  navbarShowBrand: initialNavbarShowBrand,
  showDockBranding = true,
}: {
  siteId: Id<"sites">;
  site: SiteSettingsSite;
  siteTitle: string;
  siteSlug: string;
  hostKind: "bot_subdomain" | "custom_slug";
  meridianBotId?: string;
  botName?: string;
  linkedGuildId?: string;
  caseUrlPattern?: string;
  pages: Array<{
    _id: Id<"sitePages">;
    slug: string;
    title: string;
    kind: string;
    showInNav: boolean;
    showBreadcrumbs: boolean;
    breadcrumbType?: "minimal" | "bar";
    pageAccessSettings?: PageAccessSettings;
  }>;
  initialPageId: Id<"sitePages">;
  onReady?: () => void;
  navbarStyle?: string;
  navbarText?: string;
  navbarMenu?: string;
  navbarAlign?: string;
  navbarBrandSide?: string;
  navbarLinkStyle?: string;
  navbarShowBrand?: boolean;
  showDockBranding?: boolean;
}) {
  const replaceBlocks = useMutation(api.siteBlocks.replacePageBlocks);
  const updatePage = useMutation(api.sitePages.updatePage);
  const updateSiteMeta = useMutation(api.sites.updateSiteMeta);
  const publishSite = useMutation(api.sites.publishSite);
  const ensureCaseDetail = useMutation(api.sitePages.ensureCaseDetailPage);
  const seedCases = useMutation(api.siteCases.seedMockCases);
  const upsertCollection = useMutation(api.siteCases.upsertCaseCollection);

  const [pageId, setPageId] = useState(initialPageId);
  const remoteBlocks = useQuery(api.siteBlocks.listBlocksForPage, { pageId });
  const mediaItems = useQuery(api.siteMedia.listMedia, { siteId });

  const { blocks, setBlocks, resetBlocks, undo, redo, canUndo, canRedo } =
    useUndoRedo([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const discardButtonRef = useRef<HTMLButtonElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [leftTab, setLeftTab] = useState<SidebarTab>("insert");
  const [narrowChrome, setNarrowChrome] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [builderView, setBuilderView] = useState<"builder" | "settings">("builder");
  const settingsOpen = builderView === "settings";
  const [navbarLayoutPreview, setNavbarLayoutPreview] =
    useState<NavbarLayoutPreview | null>(null);
  const [navbar, setNavbar] = useState<NavbarSettings>(() =>
    resolveNavbarSettings(
      {
        navbarStyle: initialNavbarStyle,
        navbarText: initialNavbarText,
        navbarMenu: initialNavbarMenu,
        navbarAlign: initialNavbarAlign,
        navbarBrandSide: initialNavbarBrandSide,
        navbarLinkStyle: initialNavbarLinkStyle,
        navbarShowBrand: initialNavbarShowBrand,
      },
      siteTitle,
    ),
  );
  const initialPage = pages.find((page) => page._id === initialPageId);
  const [pageSlug, setPageSlug] = useState(initialPage?.slug ?? "home");
  const [pageTitle, setPageTitle] = useState(initialPage?.title ?? "Page");
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(
    Boolean(initialPage?.showBreadcrumbs),
  );
  const [breadcrumbType, setBreadcrumbType] = useState<BreadcrumbType>(
    initialPage?.breadcrumbType === "bar" ? "bar" : "minimal",
  );
  const [pageAccessSettings, setPageAccessSettings] = useState<PageAccessSettings>(() =>
    resolvePageAccessSettings(initialPage?.pageAccessSettings),
  );
  const [navVisibility, setNavVisibility] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        pages.map((page) => [page._id, pageAppearsInNavbar(page)]),
      ),
  );
  const [activeDrag, setActiveDrag] = useState<{
    kind: "palette" | "pattern" | "canvas";
    type: string;
    label: string;
  } | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1080px)");
    let previous = media.matches;
    setNarrowChrome(previous);
    setLeftCollapsed(previous);
    setInspectorOpen(!previous);

    const sync = () => {
      const narrow = media.matches;
      setNarrowChrome(narrow);
      if (narrow !== previous) {
        setLeftCollapsed(narrow);
        setInspectorOpen(!narrow);
        previous = narrow;
      }
    };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (narrowChrome && selectedBlockId) setInspectorOpen(true);
  }, [narrowChrome, selectedBlockId]);

  const hydratedPageIdRef = useRef<Id<"sitePages"> | null>(null);

  useEffect(() => {
    if (!remoteBlocks) return;
    if (hydratedPageIdRef.current === pageId) return;
    hydratedPageIdRef.current = pageId;
    const nextBlocks = mapRemoteBlocks(remoteBlocks);
    resetBlocks(nextBlocks);
    setIsDirty(false);
    setSelectedBlockId((current) =>
      current && nextBlocks.some((block) => block.blockId === current) ? current : null,
    );
    onReady?.();
  }, [remoteBlocks, pageId, resetBlocks, onReady]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectedBlock = blocks.find((block) => block.blockId === selectedBlockId) ?? null;
  const currentPage = pages.find((page) => page._id === pageId);
  const isProtectedPageEditor = currentPage?.kind === "protected";
  const pagesForUi = useMemo(
    () =>
      pages
        .filter((page) => page.kind !== "protected")
        .map((page) =>
          page._id === pageId ? { ...page, title: pageTitle, slug: pageSlug } : page,
        ),
    [pages, pageId, pageTitle, pageSlug],
  );

  const mediaUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of mediaItems ?? []) {
      if (item.r2Key && item.url) map.set(item.r2Key, item.url);
    }
    return map;
  }, [mediaItems]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const updateNavbar = useCallback(
    (patch: Partial<NavbarSettings>) => {
      setNavbar((current) => ({ ...current, ...patch }));
      markDirty();
    },
    [markDirty],
  );

  const persistBlocks = useCallback(
    async (nextBlocks: SiteBlock[]) => {
      await replaceBlocks({
        siteId,
        pageId,
        blocks: nextBlocks.map((block) => ({
          blockId: block.blockId,
          type: block.type,
          order: block.order,
          parentBlockId: block.parentBlockId,
          props: block.props,
        })),
      });
    },
    [replaceBlocks, siteId, pageId],
  );

  const persistInfo = useCallback(async () => {
    const page = pages.find((item) => item._id === pageId);
    const writes: Array<Promise<unknown>> = [];
    if (page) {
      const serverBreadcrumbType: BreadcrumbType =
        page.breadcrumbType === "bar" ? "bar" : "minimal";
      const localShowInNav = navVisibility[page._id] ?? pageAppearsInNavbar(page);
      const serverPageAccess = resolvePageAccessSettings(page.pageAccessSettings);
      const localPageAccess = resolvePageAccessSettings(pageAccessSettings);
      const pageAccessChanged =
        JSON.stringify(localPageAccess) !== JSON.stringify(serverPageAccess);
      if (
        pageTitle !== page.title ||
        pageSlug !== page.slug ||
        showBreadcrumbs !== Boolean(page.showBreadcrumbs) ||
        breadcrumbType !== serverBreadcrumbType ||
        localShowInNav !== page.showInNav ||
        pageAccessChanged
      ) {
        writes.push(
          updatePage({
            pageId,
            title: pageTitle,
            slug: pageSlug,
            showBreadcrumbs,
            breadcrumbType,
            showInNav: localShowInNav,
            pageAccessSettings: localPageAccess,
          }),
        );
      }
    }
    for (const item of pages) {
      if (item._id === pageId) continue;
      const next = navVisibility[item._id];
      if (next !== undefined && next !== item.showInNav) {
        writes.push(updatePage({ pageId: item._id, showInNav: next }));
      }
    }
    const serverNavbar = resolveNavbarSettings(
      {
        navbarStyle: initialNavbarStyle,
        navbarText: initialNavbarText,
        navbarMenu: initialNavbarMenu,
        navbarAlign: initialNavbarAlign,
        navbarBrandSide: initialNavbarBrandSide,
        navbarLinkStyle: initialNavbarLinkStyle,
        navbarShowBrand: initialNavbarShowBrand,
      },
      siteTitle,
    );
    if (JSON.stringify(navbar) !== JSON.stringify(serverNavbar)) {
      writes.push(
        updateSiteMeta({
          siteId,
          navbarText: navbar.text,
          navbarStyle: navbar.style,
          navbarMenu: navbar.menu,
          navbarAlign: navbar.align,
          navbarBrandSide: navbar.brandSide,
          navbarLinkStyle: navbar.linkStyle,
          navbarShowBrand: navbar.showBrand,
        }),
      );
    }
    if (writes.length > 0) await Promise.all(writes);
  }, [
    pages,
    pageId,
    pageTitle,
    pageSlug,
    showBreadcrumbs,
    breadcrumbType,
    pageAccessSettings,
    navVisibility,
    updatePage,
    initialNavbarStyle,
    initialNavbarText,
    initialNavbarMenu,
    initialNavbarAlign,
    initialNavbarBrandSide,
    initialNavbarLinkStyle,
    initialNavbarShowBrand,
    siteTitle,
    navbar,
    updateSiteMeta,
    siteId,
  ]);

  const persistAll = useCallback(
    async (nextBlocks: SiteBlock[]) => {
      setSaving(true);
      try {
        await persistBlocks(nextBlocks);
        await persistInfo();
      } finally {
        setSaving(false);
      }
    },
    [persistBlocks, persistInfo],
  );

  const applyBlocks = useCallback(
    (nextBlocks: SiteBlock[]) => {
      setBlocks(nextBlocks);
      markDirty();
    },
    [setBlocks, markDirty],
  );

  const clearAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  const flushSave = useCallback(async () => {
    clearAutoSaveTimer();
    if (!isDirty) return;
    await persistAll(blocks);
    setIsDirty(false);
  }, [clearAutoSaveTimer, isDirty, persistAll, blocks]);

  useEffect(() => {
    if (!isDirty) return;
    clearAutoSaveTimer();
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      void persistAll(blocks).then(() => setIsDirty(false));
    }, AUTO_SAVE_MS);
    return clearAutoSaveTimer;
  }, [
    isDirty,
    blocks,
    pageTitle,
    pageSlug,
    showBreadcrumbs,
    breadcrumbType,
    pageAccessSettings,
    navVisibility,
    navbar,
    persistAll,
    clearAutoSaveTimer,
  ]);

  const revertToServerState = useCallback(() => {
    if (!remoteBlocks) return;
    resetBlocks(mapRemoteBlocks(remoteBlocks));
    const page = pages.find((item) => item._id === pageId);
    setNavbar(
      resolveNavbarSettings(
        {
          navbarStyle: initialNavbarStyle,
          navbarText: initialNavbarText,
          navbarMenu: initialNavbarMenu,
          navbarAlign: initialNavbarAlign,
          navbarBrandSide: initialNavbarBrandSide,
          navbarLinkStyle: initialNavbarLinkStyle,
          navbarShowBrand: initialNavbarShowBrand,
        },
        siteTitle,
      ),
    );
    setNavVisibility(
      Object.fromEntries(
        pages.map((item) => [item._id, pageAppearsInNavbar(item)]),
      ),
    );
    if (page) {
      setPageSlug(page.slug);
      setPageTitle(page.title);
      setShowBreadcrumbs(Boolean(page.showBreadcrumbs));
      setBreadcrumbType(page.breadcrumbType === "bar" ? "bar" : "minimal");
      setPageAccessSettings(resolvePageAccessSettings(page.pageAccessSettings));
    }
    clearInlineEdit();
    setIsDirty(false);
  }, [
    remoteBlocks,
    resetBlocks,
    pages,
    pageId,
    initialNavbarStyle,
    initialNavbarText,
    initialNavbarMenu,
    initialNavbarAlign,
    initialNavbarBrandSide,
    initialNavbarLinkStyle,
    initialNavbarShowBrand,
    siteTitle,
  ]);

  const publishedUrl = useMemo(
    () => buildSiteOrigin({ siteId, slug: siteSlug }),
    [siteId, siteSlug],
  );

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      await flushSave();
      await publishSite({ siteId });
      window.open(publishedUrl, "_blank", "noopener,noreferrer");
    } catch (cause) {
      window.alert(userFacingError(cause, "Could not publish site."));
    } finally {
      setPublishing(false);
    }
  }, [flushSave, publishSite, siteId, publishedUrl]);

  async function setupCaseCollection(block: SiteBlock) {
    const botId = meridianBotId ?? "mock";
    const guildKey = String(block.props.guildKey || linkedGuildId || "");
    block.props = { ...block.props, meridianBotId: botId, guildKey };
    await ensureCaseDetail({ siteId });
    await upsertCollection({
      siteId,
      blockId: block.blockId,
      meridianBotId: botId,
      scope: "guild",
      guildKey,
      typeFilter: "any",
      statusFilter: "any",
      caseUrlPattern: siteCaseUrlPattern || "/{case_slug}",
    });
    await seedCases({ siteId, meridianBotId: botId, guildKey });
  }

  async function createBlock(type: string): Promise<SiteBlock | null> {
    const entry = getBlockEntry(type);
    if (!entry) return null;
    const block: SiteBlock = {
      blockId: entry.definition.createId(entry.definition.type),
      type: entry.definition.type,
      order: 0,
      props: { ...entry.definition.defaultProps },
    };
    if (type === "case_collection") await setupCaseCollection(block);
    return block;
  }

  async function insertBlockAtTarget(
    type: string,
    parentBlockId?: string,
    index?: number,
    columnIndex?: number,
  ) {
    const block = await createBlock(type);
    if (!block) return;
    const nextBlocks = insertBlockAt(blocks, block, parentBlockId, index, columnIndex);
    applyBlocks(nextBlocks);
    setSelectedBlockId(block.blockId);
  }

  async function insertPatternNode(
    node: PatternNode,
    parentBlockId?: string,
    index?: number,
    columnIndex?: number,
    currentBlocks?: SiteBlock[],
  ): Promise<SiteBlock[]> {
    const working = currentBlocks ?? blocks;
    const entry = getBlockEntry(node.type);
    if (!entry) return working;

    const block: SiteBlock = {
      blockId: createBlockId(node.type),
      type: node.type,
      order: 0,
      props: { ...entry.definition.defaultProps, ...node.props },
    };
    if (node.type === "case_collection") await setupCaseCollection(block);

    let result = insertBlockAt(working, block, parentBlockId, index, columnIndex);
    for (const child of node.children ?? []) {
      result = await insertPatternNode(child, block.blockId, undefined, child.columnIndex, result);
    }
    return result;
  }

  async function insertPatternAtTarget(
    patternId: string,
    parentBlockId?: string,
    index?: number,
    columnIndex?: number,
  ) {
    const pattern = BLOCK_PATTERNS.find((p) => p.id === patternId);
    if (!pattern) return;

    let result = blocks;
    let insertIdx = index;
    for (const rootDef of pattern.blocks) {
      result = await insertPatternNode(rootDef, parentBlockId, insertIdx, columnIndex, result);
      insertIdx = undefined;
    }
    applyBlocks(result);
  }

  function deleteBlock(blockId: string) {
    const nextBlocks = removeBlockAndDescendants(blockId, blocks);
    applyBlocks(nextBlocks);
    setSelectedBlockId((current) => {
      if (current === blockId || getDescendantIds(blockId, blocks).includes(current ?? "")) {
        return nextBlocks[0]?.blockId ?? null;
      }
      return current;
    });
  }

  function duplicateBlock(blockId: string) {
    const nextBlocks = duplicateBlockSubtree(blockId, blocks, createBlockId);
    applyBlocks(nextBlocks);
  }

  function clearInlineEdit() {
    setEditingBlockId(null);
    setEditingFieldId(null);
  }

  const selectBlock = useCallback((blockId: string | null) => {
    if (blockId !== selectedBlockId || blockId === null) clearInlineEdit();
    setSelectedBlockId(blockId);
  }, [selectedBlockId]);

  function handleStartInlineEdit(blockId: string, fieldId?: string) {
    setSelectedBlockId(blockId);
    setEditingBlockId(blockId);
    setEditingFieldId(fieldId ?? null);
  }

  function handleInlineEdit(blockId: string, fieldId: string, value: string) {
    const nextBlocks = blocks.map((block) => {
      if (block.blockId !== blockId) return block;
      const nextProps = fieldId.startsWith("cell:")
        ? applyCellField(block.props, fieldId, value)
        : { ...block.props, [fieldId]: value };
      return { ...block, props: nextProps };
    });
    setBlocks(nextBlocks, true);
    markDirty();
    clearInlineEdit();
  }

  const updateBlockProps = useCallback(
    (blockId: string, nextProps: Record<string, unknown>) => {
      const nextBlocks = blocks.map((block) =>
        block.blockId === blockId ? { ...block, props: nextProps } : block,
      );
      applyBlocks(nextBlocks);
    },
    [blocks, applyBlocks],
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragSource | undefined;
    if (!data) return;

    if (data.source === "palette") {
      const entry = getBlockEntry(data.blockType);
      setActiveDrag({
        kind: "palette",
        type: data.blockType,
        label: entry?.definition.label ?? data.blockType,
      });
      return;
    }

    if (data.source === "pattern") {
      const pattern = BLOCK_PATTERNS.find((p) => p.id === data.patternId);
      setActiveDrag({
        kind: "pattern",
        type: data.patternId,
        label: pattern?.label ?? "Pattern",
      });
      return;
    }

    if (data.source === "canvas") {
      const block = blocks.find((item) => item.blockId === data.blockId);
      const entry = block ? getBlockEntry(block.type) : undefined;
      setActiveDrag({
        kind: "canvas",
        type: block?.type ?? "block",
        label: entry?.definition.label ?? "Block",
      });
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setDropPreview(null);
      return;
    }

    const overData = over.data.current as DragSource | undefined;
    const pointerY = pointerYFromEvent(event);
    const target = getDropTarget(
      overData,
      blocks,
      getSiblings(blocks).length,
      over.rect,
      pointerY,
    );
    setDropPreview({
      ...target,
      mode: getDropPreviewMode(overData, blocks, over.rect, pointerY),
    });
  }

  function handleDragCancel() {
    setActiveDrag(null);
    setDropPreview(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);
    setDropPreview(null);
    if (!over) return;

    const activeData = active.data.current as DragSource | undefined;
    const overData = over.data.current as DragSource | undefined;
    if (!activeData) return;

    const target = getDropTarget(
      overData,
      blocks,
      getSiblings(blocks).length,
      over.rect,
      pointerYFromEvent(event),
    );

    if (activeData.source === "palette") {
      await insertBlockAtTarget(
        activeData.blockType,
        target.parentBlockId,
        target.index,
        target.columnIndex,
      );
      return;
    }

    if (activeData.source === "pattern") {
      await insertPatternAtTarget(
        activeData.patternId,
        target.parentBlockId,
        target.index,
        target.columnIndex,
      );
      return;
    }

    if (activeData.source === "canvas" && activeData.blockId) {
      if (target.parentBlockId === activeData.blockId) return;
      const descendants = getDescendantIds(activeData.blockId, blocks);
      if (target.parentBlockId && descendants.includes(target.parentBlockId)) return;

      const nextBlocks = moveBlock(
        blocks,
        activeData.blockId,
        target.index,
        target.parentBlockId,
        target.columnIndex,
      );
      applyBlocks(nextBlocks);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (undo()) setIsDirty(true);
        return;
      }
      if (meta && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (redo()) setIsDirty(true);
        return;
      }
      if (meta && e.key === "d" && selectedBlockId) {
        e.preventDefault();
        duplicateBlock(selectedBlockId);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockId) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) {
          return;
        }
        e.preventDefault();
        deleteBlock(selectedBlockId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, selectedBlockId, blocks]);

  const previewContext = useMemo(
    () => ({
      site: { title: siteTitle, slug: siteSlug },
      page: { title: pageTitle, slug: pageSlug },
      bot: buildBotTemplateContext({
        id: meridianBotId,
        name: botName || siteTitle,
      }),
      pages: pages
        .filter((page) => page.kind !== "case_detail" && page.kind !== "protected")
        .map((page) => ({
          slug: page._id === pageId ? pageSlug : page.slug,
          title: page._id === pageId ? pageTitle : page.title,
          showInNav: navVisibility[page._id] ?? pageAppearsInNavbar(page),
        })),
      mode: "builder" as const,
      resolveVariables: false,
      caseUrlPattern: siteCaseUrlPattern,
      editingBlockId,
      editingFieldId,
      selectedBlockId,
      onInlineEdit: handleInlineEdit,
      onStartInlineEdit: handleStartInlineEdit,
      onUpdateBlockProps: updateBlockProps,
      mediaUrlResolver: (storageId: string) => mediaUrlMap.get(storageId),
    }),
    [
      siteTitle,
      siteSlug,
      meridianBotId,
      botName,
      pageTitle,
      pageSlug,
      pageId,
      pages,
      navVisibility,
      editingBlockId,
      editingFieldId,
      selectedBlockId,
      mediaUrlMap,
      updateBlockProps,
      siteCaseUrlPattern,
    ],
  );

  const selectedStorageId =
    (selectedBlock?.props.r2Key as string | undefined) ||
    (selectedBlock?.props.storageId as string | undefined);

  const applyPageSwitch = (nextPageId: Id<"sitePages">) => {
    const nextPage = pages.find((page) => page._id === nextPageId);
    setPageId(nextPageId);
    clearInlineEdit();
    setSelectedBlockId(null);
    setIsDirty(false);
    setNavbar(
      resolveNavbarSettings(
        {
          navbarStyle: initialNavbarStyle,
          navbarText: initialNavbarText,
          navbarMenu: initialNavbarMenu,
          navbarAlign: initialNavbarAlign,
          navbarBrandSide: initialNavbarBrandSide,
          navbarLinkStyle: initialNavbarLinkStyle,
          navbarShowBrand: initialNavbarShowBrand,
        },
        siteTitle,
      ),
    );
    setNavVisibility(
      Object.fromEntries(
        pages.map((page) => [page._id, pageAppearsInNavbar(page)]),
      ),
    );
    if (nextPage) {
      setPageSlug(nextPage.slug);
      setPageTitle(nextPage.title);
      setShowBreadcrumbs(Boolean(nextPage.showBreadcrumbs));
      setBreadcrumbType(nextPage.breadcrumbType === "bar" ? "bar" : "minimal");
      setPageAccessSettings(resolvePageAccessSettings(nextPage.pageAccessSettings));
    }
  };

  const selectPage = (nextPageId: Id<"sitePages">) => {
    if (nextPageId === pageId) return;
    void flushSave().then(() => applyPageSwitch(nextPageId));
  };

  const sidebar = (
    <div
      className={
        narrowChrome && !leftCollapsed && !settingsOpen
          ? "absolute inset-y-0 left-0 z-30 shadow-[24px_0_48px_rgba(0,0,0,0.45)]"
          : "relative shrink-0"
      }
    >
      <ElementsSidebar
        siteId={siteId}
        pages={pages}
        pageId={pageId}
        onSelectPage={selectPage}
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onAddBlock={(type) => void insertBlockAtTarget(type)}
        onInsertPattern={(id) => void insertPatternAtTarget(id)}
            onSelectBlock={selectBlock}
            onMediaSelect={(r2Key, url) => {
          if (selectedBlock?.type === "image") {
            updateBlockProps(selectedBlock.blockId, {
              ...selectedBlock.props,
              r2Key,
              storageId: r2Key,
              url,
            });
          }
        }}
        selectedStorageId={selectedStorageId}
        collapsed={leftCollapsed || settingsOpen}
        onToggleCollapse={() => setLeftCollapsed((v) => !v)}
        tab={leftTab}
        onTabChange={(tab) => {
          setBuilderView("builder");
          setLeftTab(tab);
        }}
      />
    </div>
  );

  const builderMain = (
    <>
      {sidebar}
      {narrowChrome && !leftCollapsed ? (
        <>
          <div className="w-12 shrink-0" aria-hidden />
          <button
            type="button"
            className="absolute inset-0 z-20 bg-black/40"
            aria-label="Dismiss tools panel"
            onClick={() => setLeftCollapsed(true)}
          />
        </>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <BuilderCanvas
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onSelectBlock={selectBlock}
          onDeleteBlock={deleteBlock}
          onDuplicateBlock={duplicateBlock}
          onUpdateBlockProps={updateBlockProps}
          onClearSelection={() => selectBlock(null)}
          context={previewContext}
          isDragging={Boolean(activeDrag)}
          dropPreview={dropPreview}
          mediaUrlMap={mediaUrlMap}
          showBreadcrumbs={isProtectedPageEditor ? false : showBreadcrumbs}
          breadcrumbType={breadcrumbType}
          navbarStyle={isProtectedPageEditor ? "hidden" : navbar.style}
          navbarText={navbar.text}
          navbarMenu={navbar.menu}
          navbarAlign={navbar.align}
          navbarBrandSide={navbar.brandSide}
          navbarLayoutPreview={navbarLayoutPreview}
          navbarLinkStyle={navbar.linkStyle}
          navbarShowBrand={navbar.showBrand}
          navbarPages={pages
            .filter((page) => page.kind !== "case_detail" && page.kind !== "protected")
            .map((page) => ({
              slug: page._id === pageId ? pageSlug : page.slug,
              title: page._id === pageId ? pageTitle : page.title,
              showInNav: navVisibility[page._id] ?? pageAppearsInNavbar(page),
            }))}
          currentSlug={pageSlug}
          showDockBranding={showDockBranding}
          protectedPreview={isProtectedPageEditor}
          theme={site.theme}
        />
      </main>

      {inspectorOpen ? (
        <>
          {narrowChrome ? (
            <button
              type="button"
              className="absolute inset-0 z-20 bg-black/40"
              aria-label="Dismiss style panel"
              onClick={() => setInspectorOpen(false)}
            />
          ) : null}
          <InspectorPanel
            siteId={siteId}
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            mediaUrlMap={mediaUrlMap}
            onSelectBlock={selectBlock}
            onUpdateProps={updateBlockProps}
            onDuplicate={duplicateBlock}
            onDelete={deleteBlock}
            onOpenMedia={() => {
              setLeftTab("media");
              setLeftCollapsed(false);
            }}
            pageTitle={pageTitle}
            pageSlug={pageSlug}
            onPageTitleChange={(title) => {
              setPageTitle(title);
              markDirty();
            }}
            onPageSlugChange={async (slug) => {
              setPageSlug(slug);
              markDirty();
            }}
            showBreadcrumbs={showBreadcrumbs}
            breadcrumbType={breadcrumbType}
            onShowBreadcrumbsChange={(value) => {
              setShowBreadcrumbs(value);
              markDirty();
            }}
            onBreadcrumbTypeChange={(value) => {
              setBreadcrumbType(value);
              markDirty();
            }}
            navbar={navbar}
            onNavbarChange={updateNavbar}
            onNavbarLayoutPreview={setNavbarLayoutPreview}
            navPages={pages
              .filter((page) => page.kind !== "case_detail" && page.kind !== "protected")
              .map((page) => ({
                id: page._id,
                title: page._id === pageId ? pageTitle : page.title,
                slug: page._id === pageId ? pageSlug : page.slug,
                showInNav: navVisibility[page._id] ?? pageAppearsInNavbar(page),
              }))}
            onShowInNavChange={(id, value) => {
              setNavVisibility((current) => ({ ...current, [id]: value }));
              markDirty();
            }}
            pageAccessSettings={pageAccessSettings}
            linkedGuildId={linkedGuildId}
            pageKind={currentPage?.kind}
            onPageAccessChange={(settings) => {
              setPageAccessSettings(settings);
              markDirty();
            }}
            overlay={narrowChrome}
            onClose={narrowChrome ? () => setInspectorOpen(false) : undefined}
          />
        </>
      ) : null}
    </>
  );

  return (
    <div
      className={`site-builder flex h-screen flex-col overflow-hidden bg-[#090909] text-zinc-100${
        activeDrag ? " cursor-grabbing" : ""
      }`}
    >
      <header className="site-builder-surface flex h-12 shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] px-2 sm:gap-4 sm:px-3">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto sm:gap-3">
          <Link
            href="/dashboard/sites"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
            aria-label="Back to sites"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dock-logo.svg" alt="" width={22} height={22} className="size-5" />
          </Link>
          <span className="max-w-[min(100%,10rem)] truncate text-sm font-medium text-zinc-100 sm:max-w-xs">
            {siteTitle}
          </span>
          {!settingsOpen ? (
            <>
              <span className="text-zinc-700" aria-hidden>
                /
              </span>
              <PageSwitcher pages={pagesForUi} pageId={pageId} onSelectPage={selectPage} />
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-0.5 overflow-x-auto" role="toolbar" aria-label="Builder actions">
          {!settingsOpen ? (
            <>
              <button
                type="button"
                disabled={!canUndo}
                onClick={() => {
                  if (undo()) markDirty();
                }}
                className="site-builder-icon-btn"
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <i className="bx bx-undo text-sm" aria-hidden />
              </button>
              <button
                type="button"
                disabled={!canRedo}
                onClick={() => {
                  if (redo()) markDirty();
                }}
                className="site-builder-icon-btn"
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <i className="bx bx-redo text-sm" aria-hidden />
              </button>
              {saving ? (
                <span
                  className="site-builder-icon-btn pointer-events-none text-zinc-500"
                  title="Saving..."
                  aria-label="Saving"
                >
                  <i className="bx bx-loader-alt animate-spin text-sm" aria-hidden />
                </span>
              ) : null}
              <button
                ref={discardButtonRef}
                type="button"
                disabled={!isDirty || saving}
                onClick={() => setDiscardConfirmOpen(true)}
                className={`site-builder-icon-btn ${isDirty ? "text-zinc-200" : ""}`}
                title="Discard changes"
                aria-label="Discard changes"
              >
                <i className="bx bx-reset text-sm" aria-hidden />
              </button>
              {narrowChrome || !inspectorOpen ? (
                <button
                  type="button"
                  onClick={() => setInspectorOpen((open) => !open)}
                  className={`site-builder-icon-btn ${inspectorOpen ? "text-zinc-200" : ""}`}
                  title={selectedBlockId ? "Style panel" : "Page panel"}
                  aria-label={selectedBlockId ? "Toggle style panel" : "Toggle page panel"}
                  aria-pressed={inspectorOpen}
                >
                  <i className="bx bx-slider-alt text-sm" aria-hidden />
                </button>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (settingsOpen) {
                setBuilderView("builder");
                return;
              }
              setBuilderView("settings");
              setLeftCollapsed(true);
            }}
            className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              settingsOpen
                ? "bg-white/[0.08] text-zinc-100"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
            }`}
            aria-label={settingsOpen ? "Close settings" : "Open settings"}
            aria-pressed={settingsOpen}
          >
            Settings
          </button>
          <button
            type="button"
            disabled={publishing || saving}
            onClick={() => void handlePublish()}
            className="site-builder-icon-btn site-builder-icon-btn-primary"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <SiteSettingsDialog
          siteId={siteId}
          preloadedSite={site}
          hidden={!settingsOpen}
          onClose={() => setBuilderView("builder")}
        />
        {!settingsOpen ? (
          <DndContext
            sensors={sensors}
            collisionDetection={preferSpecificCollisions}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragCancel={handleDragCancel}
            onDragEnd={(event) => void handleDragEnd(event)}
          >
            <div className="relative flex min-h-0 flex-1">{builderMain}</div>
            <DragOverlay dropAnimation={null}>
              {activeDrag ? (
                <PaletteDragOverlay label={activeDrag.label} type={activeDrag.type} />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : null}
      </div>

      <ConfirmMenu
        open={discardConfirmOpen}
        anchor={discardButtonRef.current}
        title="Discard changes?"
        description="This will revert the current page to the last saved version."
        confirmLabel="Discard"
        variant="danger"
        onCancel={() => setDiscardConfirmOpen(false)}
        onConfirm={() => {
          clearAutoSaveTimer();
          revertToServerState();
          setDiscardConfirmOpen(false);
        }}
      />
    </div>
  );
}
