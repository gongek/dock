"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BLOCK_PALETTE } from "@/lib/blocks/registry";
import { BLOCK_PATTERNS } from "@/lib/blocks/patterns";
import { BLOCK_ICONS } from "@/lib/blocks/icons";
import { BlockListPanel } from "@/components/builder/block-list-panel";
import { MediaLibrary } from "@/components/builder/media-library";
import { PagesPanel, type BuilderPage } from "@/components/builder/pages-panel";
import type { Id } from "../../../convex/_generated/dataModel";
import type { SiteBlock } from "@/lib/blocks/types";
import { FloatingTooltipHost } from "@/components/ui/floating-tooltip";

const BLOCK_GROUPS: { title: string; types: string[] }[] = [
  {
    title: "Layout",
    types: ["section", "columns", "row", "group", "card", "divider", "spacer"],
  },
  {
    title: "Content",
    types: [
      "heading",
      "text",
      "list",
      "quote",
      "callout",
      "faq",
      "code",
      "table",
      "stat",
      "badge",
      "icon",
      "timeline",
      "progress",
      "countdown",
      "graph",
    ],
  },
  {
    title: "Media",
    types: ["image", "video", "audio", "embed", "map", "avatar"],
  },
  {
    title: "Actions",
    types: ["button", "link", "download", "social"],
  },
  {
    title: "Site",
    types: ["nav", "footer", "case_collection"],
  },
];

export type SidebarTab = "pages" | "insert" | "layers" | "media";

export function SidebarTabButton({
  active,
  label,
  icon,
  onClick,
  ...props
}: {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
} & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative flex size-9 items-center justify-center rounded-lg transition-colors duration-200 ease-out motion-reduce:transition-none ${
        active
          ? "bg-white/[0.07] text-zinc-100"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
      }`}
      {...props}
    >
      {active ? (
        <span
          className="absolute left-0.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-zinc-200"
          aria-hidden
        />
      ) : null}
      <i className={`bx ${icon} text-lg leading-none`} aria-hidden />
    </button>
  );
}

function PaletteItem({
  type,
  label,
  selected,
  onAdd,
}: {
  type: string;
  label: string;
  selected?: boolean;
  onAdd: (type: string) => void;
}) {
  const draggedRef = useRef(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: "palette", blockType: type },
  });

  useEffect(() => {
    if (isDragging) draggedRef.current = true;
  }, [isDragging]);

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => {
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        onAdd(type);
      }}
      className={`flex w-full cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors active:cursor-grabbing ${
        selected
          ? "bg-white/[0.08] text-zinc-100"
          : "text-zinc-300 hover:bg-white/[0.07] hover:text-zinc-100"
      } ${isDragging ? "cursor-grabbing opacity-40" : ""}`}
    >
      <i
        className={`bx ${BLOCK_ICONS[type] ?? "bx-cube"} shrink-0 text-sm ${
          selected ? "text-zinc-300" : "text-zinc-500"
        }`}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

function PatternItem({
  patternId,
  label,
  selected,
  onInsert,
}: {
  patternId: string;
  label: string;
  selected?: boolean;
  onInsert: (patternId: string) => void;
}) {
  const draggedRef = useRef(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pattern-${patternId}`,
    data: { source: "pattern", patternId },
  });

  useEffect(() => {
    if (isDragging) draggedRef.current = true;
  }, [isDragging]);

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => {
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        onInsert(patternId);
      }}
      className={`flex w-full cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors active:cursor-grabbing ${
        selected
          ? "bg-white/[0.08] text-zinc-100"
          : "text-zinc-300 hover:bg-white/[0.07] hover:text-zinc-100"
      } ${isDragging ? "cursor-grabbing opacity-40" : ""}`}
    >
      <i
        className={`bx bx-file shrink-0 text-sm ${selected ? "text-zinc-300" : "text-zinc-500"}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

function InsertSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-white/[0.06]">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="min-w-0 flex-1 px-2 py-2.5 text-left text-[13px] text-zinc-400 transition-colors hover:text-zinc-200"
        >
          {title}
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          className="flex size-8 shrink-0 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <i className="bx bx-plus text-base leading-none" aria-hidden />
        </button>
      </div>
      {open ? <div className="flex flex-col px-1 pb-2">{children}</div> : null}
    </section>
  );
}

export function ElementsSidebar({
  siteId,
  pages,
  pageId,
  onSelectPage,
  blocks,
  selectedBlockId,
  onAddBlock,
  onInsertPattern,
  onSelectBlock,
  onMediaSelect,
  selectedStorageId,
  collapsed,
  onToggleCollapse,
  tab,
  onTabChange,
}: {
  siteId: Id<"sites">;
  pages: BuilderPage[];
  pageId: Id<"sitePages">;
  onSelectPage: (pageId: Id<"sitePages">) => void;
  blocks: SiteBlock[];
  selectedBlockId: string | null;
  onAddBlock: (type: string) => void;
  onInsertPattern: (patternId: string) => void;
  onSelectBlock: (blockId: string) => void;
  onMediaSelect?: (storageId: string, url: string) => void;
  selectedStorageId?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedInsertId, setSelectedInsertId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Components: false,
    Layout: true,
    Content: true,
    Media: true,
    Actions: true,
    Site: true,
  });
  const paletteByType = Object.fromEntries(BLOCK_PALETTE.map((item) => [item.type, item]));

  const toggleSection = (title: string) => {
    setOpenSections((current) => ({ ...current, [title]: !current[title] }));
  };

  const tabs: { id: SidebarTab; label: string; icon: string }[] = [
    { id: "pages", label: "Pages", icon: "bx-file" },
    { id: "insert", label: "Insert", icon: "bx-plus" },
    { id: "layers", label: "Layers", icon: "bx-layer" },
    { id: "media", label: "Media", icon: "bx-image" },
  ];

  const isCollapsed = collapsed ?? false;
  const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0]!;

  const selectTab = (id: SidebarTab) => {
    if (!isCollapsed && tab === id) {
      onToggleCollapse?.();
      return;
    }
    onTabChange(id);
    if (isCollapsed) onToggleCollapse?.();
  };

  const filteredPatterns = BLOCK_PATTERNS.filter((pattern) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      pattern.label.toLowerCase().includes(q) ||
      pattern.description.toLowerCase().includes(q)
    );
  });

  return (
    <aside className="site-builder-surface flex h-full shrink-0 overflow-hidden border-r border-white/[0.07]">
      <FloatingTooltipHost className="flex w-12 shrink-0 flex-col border-r border-white/[0.07]">
        {({ showTooltip }) => (
          <>
            <div
              role="tablist"
              aria-label="Builder tools"
              aria-orientation="vertical"
              className="flex flex-1 flex-col items-center gap-1 px-1.5 py-2"
            >
              {tabs.map((item) => (
                <div key={item.id} className="contents">
                  {item.id === "insert" ? (
                    <div className="my-1 h-px w-6 bg-white/[0.08]" aria-hidden />
                  ) : null}
                  <SidebarTabButton
                    role="tab"
                    aria-selected={!isCollapsed && tab === item.id}
                    aria-controls={`sidebar-panel-${item.id}`}
                    id={`sidebar-tab-${item.id}`}
                    active={!isCollapsed && tab === item.id}
                    label={item.label}
                    icon={item.icon}
                    onClick={() => selectTab(item.id)}
                    onMouseEnter={(event) => showTooltip(item.label, event.currentTarget)}
                  />
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.07] p-1.5">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex size-9 w-full items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
                aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
              >
                <i
                  className={`bx ${isCollapsed ? "bx-chevrons-right" : "bx-chevrons-left"} text-lg leading-none`}
                  aria-hidden
                />
              </button>
            </div>
          </>
        )}
      </FloatingTooltipHost>

      <div
        className={`grid min-h-0 min-w-0 overflow-hidden transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none ${
          isCollapsed ? "grid-cols-[0fr] pointer-events-none" : "grid-cols-[1fr]"
        }`}
        aria-hidden={isCollapsed}
        inert={isCollapsed || undefined}
      >
        <div className="min-h-0 min-w-0 overflow-hidden">
        <div className="flex h-full w-64 min-w-64 flex-col">
          {tab === "insert" ? (
            <div className="shrink-0 px-2 pt-2">
              <div className="relative">
                <i
                  className="bx bx-search pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500"
                  aria-hidden
                />
                <input
                  type="search"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#141414] py-1.5 pl-8 pr-2.5 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-white/15"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-10 shrink-0 items-center border-b border-white/[0.07] px-3">
              <p className="text-[13px] font-medium text-zinc-400">
                {activeTab.label}
              </p>
            </div>
          )}
          <div
            id={`sidebar-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`sidebar-tab-${tab}`}
            className="site-builder-scroll flex-1 overflow-y-auto"
          >
            {tab === "insert" && (
              <div className="px-1 pt-1">
                {filteredPatterns.length > 0 ? (
                  <InsertSection
                    title="Components"
                    open={Boolean(search) || Boolean(openSections.Components)}
                    onToggle={() => toggleSection("Components")}
                  >
                    {filteredPatterns.map((pattern) => (
                      <PatternItem
                        key={pattern.id}
                        patternId={pattern.id}
                        label={pattern.label}
                        selected={selectedInsertId === `pattern-${pattern.id}`}
                        onInsert={(id) => {
                          setSelectedInsertId(`pattern-${id}`);
                          onInsertPattern(id);
                        }}
                      />
                    ))}
                  </InsertSection>
                ) : null}
                {BLOCK_GROUPS.map((group) => {
                  const items = group.types
                    .map((type) => paletteByType[type])
                    .filter((item) => {
                      if (!item) return false;
                      if (!search) return true;
                      return item.label.toLowerCase().includes(search.toLowerCase());
                    });
                  if (items.length === 0) return null;
                  return (
                    <InsertSection
                      key={group.title}
                      title={group.title}
                      open={Boolean(search) || Boolean(openSections[group.title])}
                      onToggle={() => toggleSection(group.title)}
                    >
                      {items.map((item) => (
                        <PaletteItem
                          key={item.type}
                          type={item.type}
                          label={item.label}
                          selected={selectedInsertId === `palette-${item.type}`}
                          onAdd={(type) => {
                            setSelectedInsertId(`palette-${type}`);
                            onAddBlock(type);
                          }}
                        />
                      ))}
                    </InsertSection>
                  );
                })}
              </div>
            )}

            {tab === "pages" && (
              <PagesPanel
                siteId={siteId}
                pages={pages}
                pageId={pageId}
                onSelectPage={onSelectPage}
              />
            )}

            {tab === "media" && (
              <MediaLibrary
                siteId={siteId}
                onSelect={onMediaSelect}
                selectedStorageId={selectedStorageId}
              />
            )}

            {tab === "layers" && (
              <BlockListPanel
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={onSelectBlock}
              />
            )}
          </div>
        </div>
        </div>
      </div>
    </aside>
  );
}

export function PaletteDragOverlay({ label, type }: { label: string; type: string }) {
  return (
    <div className="flex w-52 items-center gap-3 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2">
      <span className="flex size-8 shrink-0 items-center justify-center text-zinc-200">
        <i className={`bx ${BLOCK_ICONS[type] ?? "bx-cube"} text-base leading-none`} aria-hidden />
      </span>
      <span className="truncate text-xs font-medium text-zinc-100">{label}</span>
    </div>
  );
}
