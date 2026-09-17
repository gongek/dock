"use client";

import { useEffect, useState } from "react";
import { getBlockEntry } from "@/lib/blocks/registry";
import { BLOCK_ICONS } from "@/lib/blocks/icons";
import { getBlockPath } from "@/lib/blocks/tree";
import type { SiteBlock } from "@/lib/blocks/types";
import type { Id } from "../../../convex/_generated/dataModel";
import { BlockSettingsPanel } from "@/components/builder/block-settings-panel";
import { PositionPanel } from "@/components/builder/position-panel";
import {
  InspectorIconBar,
  InspectorIconButton,
  InspectorRow,
  InspectorSection,
  InspectorSubsection,
  InspectorSwitch,
} from "@/components/builder/inspector-chrome";
import { Dropdown } from "@/components/ui/dropdown";
import {
  BREADCRUMB_TYPE_OPTIONS,
  type BreadcrumbType,
} from "@/components/blocks/page-breadcrumbs";
import {
  formatIdListInput,
  PAGE_ACCESS_MODE_OPTIONS,
  parseIdListInput,
  resolvePageAccessSettings,
  type PageAccessMode,
  type PageAccessSettings,
} from "@/lib/page-access";
import {
  NAVBAR_ARRANGE_OPTIONS,
  NAVBAR_ARRANGE_WITH_BRAND_OPTIONS,
  NAVBAR_LINK_STYLE_OPTIONS,
  NAVBAR_MENU_OPTIONS,
  NAVBAR_STYLE_OPTIONS,
  isNavbarSplit,
  navbarArrangeWithBrandValue,
  type NavbarAlign,
  type NavbarBrandSide,
  type NavbarLayoutPreview,
  type NavbarSettings,
} from "@/lib/sites/navbar";
import { userFacingError } from "@/lib/user-facing-error";

export function InspectorPanel({
  blocks,
  siteId,
  selectedBlockId,
  mediaUrlMap,
  onSelectBlock,
  onUpdateProps,
  onDuplicate,
  onDelete,
  onOpenMedia,
  pageTitle,
  pageSlug,
  onPageTitleChange,
  onPageSlugChange,
  showBreadcrumbs,
  breadcrumbType,
  onShowBreadcrumbsChange,
  onBreadcrumbTypeChange,
  navbar,
  onNavbarChange,
  onNavbarLayoutPreview,
  navPages,
  onShowInNavChange,
  pageAccessSettings,
  linkedGuildId,
  pageKind,
  onPageAccessChange,
  overlay = false,
  onClose,
}: {
  blocks: SiteBlock[];
  siteId: Id<"sites">;
  selectedBlockId: string | null;
  mediaUrlMap: Map<string, string>;
  onSelectBlock: (blockId: string) => void;
  onUpdateProps: (blockId: string, props: Record<string, unknown>) => void;
  onDuplicate: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onOpenMedia: () => void;
  pageTitle: string;
  pageSlug: string;
  onPageTitleChange: (title: string) => void;
  onPageSlugChange: (slug: string) => Promise<void>;
  showBreadcrumbs: boolean;
  breadcrumbType: BreadcrumbType;
  onShowBreadcrumbsChange: (value: boolean) => void;
  onBreadcrumbTypeChange: (value: BreadcrumbType) => void;
  navbar: NavbarSettings;
  onNavbarChange: (patch: Partial<NavbarSettings>) => void;
  onNavbarLayoutPreview: (preview: NavbarLayoutPreview | null) => void;
  navPages: Array<{ id: string; title: string; slug: string; showInNav: boolean }>;
  onShowInNavChange: (pageId: string, value: boolean) => void;
  pageAccessSettings: PageAccessSettings;
  linkedGuildId?: string;
  pageKind?: string;
  onPageAccessChange: (settings: PageAccessSettings) => void;
  overlay?: boolean;
  onClose?: () => void;
}) {
  const block = blocks.find((item) => item.blockId === selectedBlockId) ?? null;
  const entry = block ? getBlockEntry(block.type) : undefined;
  const path = block ? getBlockPath(block.blockId, blocks) : [];
  const isProtectedPageEditor = pageKind === "protected";
  const panelTitle = block ? "Style" : isProtectedPageEditor ? "Protected page" : "Page";
  const closePanelLabel = block ? "Close style panel" : "Close page panel";

  return (
    <aside
      className={`site-builder-surface flex h-full w-80 max-w-[calc(100vw-3rem)] shrink-0 flex-col overflow-hidden border-l border-white/[0.07] ${
        overlay
          ? "absolute inset-y-0 right-0 z-30 shadow-[-24px_0_48px_rgba(0,0,0,0.45)]"
          : ""
      }`}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.07] px-3">
        <p className="text-[13px] font-medium text-zinc-400">{panelTitle}</p>
        <div className="flex items-center gap-0.5">
          {block ? (
            <>
              <button
                type="button"
                onClick={() => onDuplicate(block.blockId)}
                className="flex size-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                title="Duplicate"
                aria-label="Duplicate block"
              >
                <i className="bx bx-copy text-sm" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onDelete(block.blockId)}
                className="flex size-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.04] hover:text-red-300"
                title="Delete"
                aria-label="Delete block"
              >
                <i className="bx bx-trash text-sm" aria-hidden />
              </button>
            </>
          ) : null}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
              title={closePanelLabel}
              aria-label={closePanelLabel}
            >
              <i className="bx bx-x text-base" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {block && entry ? (
        <div className="site-builder-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="border-b border-white/[0.07] px-3 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center text-zinc-300">
                <i
                  className={`bx ${BLOCK_ICONS[block.type] ?? "bx-cube"} text-base`}
                  aria-hidden
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">
                  {entry.definition.label}
                </p>
                <p className="truncate text-[11px] text-zinc-500">{block.type}</p>
              </div>
            </div>
            {path.length > 1 ? (
              <nav aria-label="Block path" className="mt-2.5 flex flex-wrap items-center gap-1">
                {path.map((item, index) => {
                  const itemEntry = getBlockEntry(item.type);
                  const isLast = index === path.length - 1;
                  return (
                    <span key={item.blockId} className="flex items-center gap-1">
                      {index > 0 ? (
                        <i className="bx bx-chevron-right text-[10px] text-zinc-600" aria-hidden />
                      ) : null}
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => onSelectBlock(item.blockId)}
                        className={`max-w-[88px] truncate text-[11px] ${
                          isLast
                            ? "text-zinc-300"
                            : "text-zinc-500 hover:text-zinc-200"
                        }`}
                      >
                        {itemEntry?.definition.label ?? item.type}
                      </button>
                    </span>
                  );
                })}
              </nav>
            ) : null}
          </div>
          <PositionPanel
            block={block}
            onUpdateProps={(props) => onUpdateProps(block.blockId, props)}
          />
          <BlockSettingsPanel
            block={block}
            siteId={siteId}
            mediaUrlMap={mediaUrlMap}
            onUpdateProps={(props) => onUpdateProps(block.blockId, props)}
            onOpenMedia={onOpenMedia}
          />
        </div>
      ) : (
        <div className="site-builder-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
          {isProtectedPageEditor ? (
            <InspectorSection
              title="Page details"
              description="Shown when a visitor tries to open a protected page without access."
            >
              <InspectorRow label="Title">
                <input
                  aria-label="Page title"
                  value={pageTitle}
                  onChange={(event) => onPageTitleChange(event.target.value)}
                  className="site-builder-field site-builder-field-compact min-w-0 flex-1"
                />
              </InspectorRow>
            </InspectorSection>
          ) : (
            <>
          <InspectorSection title="Page details">
            <InspectorRow label="Title">
              <input
                aria-label="Page title"
                value={pageTitle}
                onChange={(event) => onPageTitleChange(event.target.value)}
                className="site-builder-field site-builder-field-compact min-w-0 flex-1"
              />
            </InspectorRow>
            <PageSlugRow slug={pageSlug} onCommit={onPageSlugChange} />
          </InspectorSection>

          <InspectorSection title="Breadcrumbs">
            <InspectorRow label="Show">
              <InspectorSwitch
                label="Show breadcrumbs"
                checked={showBreadcrumbs}
                onChange={onShowBreadcrumbsChange}
              />
            </InspectorRow>
            {showBreadcrumbs ? (
              <InspectorRow label="Style">
                <Dropdown
                  aria-label="Breadcrumb style"
                  variant="compact"
                  value={breadcrumbType}
                  options={BREADCRUMB_TYPE_OPTIONS}
                  onChange={onBreadcrumbTypeChange}
                />
              </InspectorRow>
            ) : null}
          </InspectorSection>

          <InspectorSection
            title="Who can view"
            description="Restrict this page to certain Discord users. Visitors without access see your site's protected-page message (configured in the Pages tab)."
          >
            <InspectorRow label="Access">
              <Dropdown
                aria-label="Page access"
                variant="compact"
                value={pageAccessSettings.mode}
                options={PAGE_ACCESS_MODE_OPTIONS}
                onChange={(value) => {
                  const mode = value as PageAccessMode;
                  onPageAccessChange(
                    resolvePageAccessSettings({
                      mode,
                      ...(mode === "roles"
                        ? { allowedRoleIds: pageAccessSettings.allowedRoleIds ?? [] }
                        : {}),
                      ...(mode === "whitelist"
                        ? { allowedUserIds: pageAccessSettings.allowedUserIds ?? [] }
                        : {}),
                    }),
                  );
                }}
              />
            </InspectorRow>
            {pageAccessSettings.mode === "roles" ? (
              <>
                {!linkedGuildId ? (
                  <p className="px-1 text-[11px] text-amber-400/90">
                    Link a Discord guild in site settings before role restrictions work.
                  </p>
                ) : null}
                <InspectorRow
                  label="Role IDs"
                  hint="Paste one role ID per line. In Discord: Server Settings → Roles → right-click role → Copy ID."
                >
                  <textarea
                    aria-label="Allowed Discord role IDs"
                    value={formatIdListInput(pageAccessSettings.allowedRoleIds)}
                    onChange={(event) =>
                      onPageAccessChange({
                        ...pageAccessSettings,
                        allowedRoleIds: parseIdListInput(event.target.value),
                      })
                    }
                    placeholder="Paste role IDs, one per line"
                    rows={3}
                    className="site-builder-field min-h-[4.5rem] min-w-0 flex-1 resize-y"
                  />
                </InspectorRow>
              </>
            ) : null}
            {pageAccessSettings.mode === "whitelist" ? (
              <InspectorRow label="User IDs">
                <textarea
                  aria-label="Allowed Discord user IDs"
                  value={formatIdListInput(pageAccessSettings.allowedUserIds)}
                  onChange={(event) =>
                    onPageAccessChange({
                      ...pageAccessSettings,
                      allowedUserIds: parseIdListInput(event.target.value),
                    })
                  }
                  placeholder="Paste user IDs, one per line"
                  rows={3}
                  className="site-builder-field min-h-[4.5rem] min-w-0 flex-1 resize-y"
                />
              </InspectorRow>
            ) : null}
          </InspectorSection>

          <InspectorSection
            title="Navigation bar"
            description="Site-wide header shown on every page."
          >
            <InspectorSubsection title="Appearance">
              <InspectorRow label="Style">
                <Dropdown
                  aria-label="Navbar style"
                  variant="compact"
                  value={navbar.style}
                  options={NAVBAR_STYLE_OPTIONS}
                  onChange={(value) => onNavbarChange({ style: value })}
                />
              </InspectorRow>
              {navbar.style !== "hidden" && navbar.style !== "minimal" ? (
                <>
                  <InspectorRow label="Menu">
                    <Dropdown
                      aria-label="Navbar menu"
                      variant="compact"
                      value={navbar.menu}
                      options={NAVBAR_MENU_OPTIONS}
                      onChange={(value) => onNavbarChange({ menu: value })}
                    />
                  </InspectorRow>
                  <InspectorRow label="Links">
                    <Dropdown
                      aria-label="Navbar link style"
                      variant="compact"
                      value={navbar.linkStyle}
                      options={NAVBAR_LINK_STYLE_OPTIONS}
                      onChange={(value) => onNavbarChange({ linkStyle: value })}
                    />
                  </InspectorRow>
                </>
              ) : null}
            </InspectorSubsection>

            {navbar.style !== "hidden" ? (
              <InspectorSubsection title="Brand">
                <InspectorRow label="Show">
                  <InspectorSwitch
                    label="Show brand"
                    checked={navbar.showBrand}
                    onChange={(value) => {
                      onNavbarLayoutPreview(null);
                      if (!value) {
                        onNavbarChange({
                          showBrand: false,
                          align:
                            navbar.align === "end" || navbar.align === "center"
                              ? navbar.align
                              : "start",
                        });
                      } else {
                        onNavbarChange({ showBrand: true });
                      }
                    }}
                  />
                </InspectorRow>
                {navbar.showBrand ? (
                  <InspectorRow
                    label="Text"
                    hint={"Use {bot.name} to insert your bot's name automatically."}
                  >
                    <input
                      value={navbar.text}
                      onChange={(event) => onNavbarChange({ text: event.target.value })}
                      placeholder="{bot.name}"
                      className="site-builder-field site-builder-field-compact min-w-0 flex-1"
                    />
                  </InspectorRow>
                ) : null}
              </InspectorSubsection>
            ) : null}

            {navbar.style !== "hidden" && navbar.style !== "minimal" ? (
              <InspectorSubsection title="Layout">
                <InspectorRow label="Arrange">
                  {navbar.showBrand ? (
                    <Dropdown
                      aria-label="Navbar arrangement"
                      variant="compact"
                      value={navbarArrangeWithBrandValue(navbar.align)}
                      options={[...NAVBAR_ARRANGE_WITH_BRAND_OPTIONS]}
                      onChange={(value) => {
                        onNavbarLayoutPreview(null);
                        if (value === "opposite") {
                          onNavbarChange({ align: "between" });
                          return;
                        }
                        onNavbarChange({
                          align:
                            navbar.align === "between" ? "start" : navbar.align,
                        });
                      }}
                    />
                  ) : (
                    <Dropdown
                      aria-label="Navbar arrangement"
                      variant="compact"
                      value={navbar.align === "between" ? "start" : navbar.align}
                      options={NAVBAR_ARRANGE_OPTIONS}
                      onChange={(value) => {
                        onNavbarLayoutPreview(null);
                        onNavbarChange({ align: value });
                      }}
                    />
                  )}
                </InspectorRow>
                {navbar.showBrand && isNavbarSplit(navbar.align) ? (
                  <InspectorRow label="Brand side">
                    <InspectorIconBar onMouseLeave={() => onNavbarLayoutPreview(null)}>
                      {(
                        [
                          ["start", "bx-align-left", "Left"],
                          ["end", "bx-align-right", "Right"],
                        ] as Array<[NavbarBrandSide, string, string]>
                      ).map(([value, icon, label]) => (
                        <InspectorIconButton
                          key={value}
                          label={label}
                          icon={icon}
                          pressed={navbar.brandSide === value}
                          onHover={() =>
                            onNavbarLayoutPreview({
                              align: "between",
                              brandSide: value,
                            })
                          }
                          onClick={() => {
                            onNavbarLayoutPreview(null);
                            onNavbarChange({ brandSide: value });
                          }}
                        />
                      ))}
                    </InspectorIconBar>
                  </InspectorRow>
                ) : navbar.showBrand ? (
                  <InspectorRow label="Align">
                    <InspectorIconBar onMouseLeave={() => onNavbarLayoutPreview(null)}>
                      {(
                        [
                          ["start", "bx-align-left", "Left"],
                          ["center", "bx-align-middle", "Center"],
                          ["end", "bx-align-right", "Right"],
                        ] as Array<[NavbarAlign, string, string]>
                      ).map(([value, icon, label]) => (
                        <InspectorIconButton
                          key={value}
                          label={label}
                          icon={icon}
                          pressed={navbar.align === value}
                          onHover={() => onNavbarLayoutPreview({ align: value })}
                          onClick={() => {
                            onNavbarLayoutPreview(null);
                            onNavbarChange({ align: value });
                          }}
                        />
                      ))}
                    </InspectorIconBar>
                  </InspectorRow>
                ) : null}
              </InspectorSubsection>
            ) : null}

            {navbar.style !== "hidden" && navbar.style !== "minimal" && navPages.length > 0 ? (
              <InspectorSubsection title="Pages in menu">
                {navPages.map((page) => (
                  <InspectorRow key={page.id} label={page.title || page.slug}>
                    <InspectorSwitch
                      label={`Show ${page.title} in menu`}
                      checked={page.showInNav !== false}
                      onChange={(value) => onShowInNavChange(page.id, value)}
                    />
                  </InspectorRow>
                ))}
              </InspectorSubsection>
            ) : null}
          </InspectorSection>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

function PageSlugRow({
  slug,
  onCommit,
}: {
  slug: string;
  onCommit: (slug: string) => Promise<void>;
}) {
  const locked = slug === "home";
  const [draft, setDraft] = useState(locked ? "" : slug);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(locked ? "" : slug);
    setError(null);
  }, [locked, slug]);

  async function commit() {
    if (locked || saving) return;
    const next = draft.trim().toLowerCase();
    if (!next || next === slug) {
      setDraft(slug);
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCommit(next);
    } catch (cause) {
      setError(userFacingError(cause, "Could not update slug."));
      setDraft(slug);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <InspectorRow
        label="Slug"
        hint={locked ? "Home is always at / and cannot be changed." : undefined}
      >
        <span className={`shrink-0 text-[11px] text-zinc-600 ${locked ? "cursor-not-allowed" : ""}`}>
          /
        </span>
        <input
          aria-label="Page slug"
          placeholder=""
          value={draft}
          readOnly={locked}
          disabled={saving && !locked}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              (event.target as HTMLInputElement).blur();
            }
            if (event.key === "Escape") {
              setDraft(locked ? "" : slug);
              setError(null);
              (event.target as HTMLInputElement).blur();
            }
          }}
          className={`site-builder-field site-builder-field-compact min-w-0 flex-1 disabled:opacity-50 ${
            locked ? "pointer-events-none opacity-50" : ""
          }`}
        />
      </InspectorRow>
      {error ? (
        <p className="pl-[4.5rem] text-[11px] text-red-400">{error}</p>
      ) : null}
    </>
  );
}
