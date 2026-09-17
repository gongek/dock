"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getBlockEntry } from "@/lib/blocks/registry";
import type { BlockEditorField, SiteBlock } from "@/lib/blocks/types";
import { displayToStorage, storageToDisplay } from "@/lib/variables/format";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Dropdown } from "@/components/ui/dropdown";
import { InspectorRow, InspectorSection, InspectorSwitch } from "@/components/builder/inspector-chrome";
import { LAYOUT_FIELD_IDS } from "@/components/builder/position-panel";
import {
  parseSocialLinkDrafts,
  serializeSocialLinkDrafts,
  updateSocialLinkDraft,
} from "@/lib/blocks/social";

const INLINE_TEXT_FIELD_IDS = new Set(["text"]);

function visibleFields(block: SiteBlock): BlockEditorField[] {
  const entry = getBlockEntry(block.type);
  if (!entry) return [];
  return entry.fields.filter((field) => {
    if (field.kind === "table") return false;
    if (INLINE_TEXT_FIELD_IDS.has(field.id) && (block.type === "heading" || block.type === "text")) {
      return false;
    }
    if (LAYOUT_FIELD_IDS.has(field.id)) return false;
    if (field.visibleWhen && !field.visibleWhen(block.props)) return false;
    return true;
  });
}

export function BlockSettingsPanel({
  block,
  siteId,
  mediaUrlMap,
  onUpdateProps,
  onOpenMedia,
}: {
  block: SiteBlock;
  siteId?: Id<"sites">;
  mediaUrlMap: Map<string, string>;
  onUpdateProps: (props: Record<string, unknown>) => void;
  onOpenMedia?: () => void;
}) {
  const entry = getBlockEntry(block.type);
  const fields = visibleFields(block);

  if (!entry) return null;

  if (fields.length === 0) {
    return null;
  }

  return (
    <InspectorSection title="Content">
      {fields.map((field) => {
        const value = block.props[field.id];

        if (field.kind === "media") {
          const r2Key = String(block.props.r2Key ?? block.props.storageId ?? "");
          const previewUrl =
            (typeof block.props.url === "string" && block.props.url) ||
            (r2Key ? mediaUrlMap.get(r2Key) : undefined);
          return (
            <div key={field.id} className="flex flex-col gap-1.5">
              <span className="text-[11px] text-zinc-400">{field.label}</span>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="h-24 w-full rounded-lg border border-white/[0.08] object-cover"
                />
              ) : (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/[0.08] text-[11px] text-zinc-500">
                  No image selected
                </div>
              )}
              <div className="flex items-center gap-2">
                {onOpenMedia ? (
                  <button
                    type="button"
                    onClick={onOpenMedia}
                    className="rounded-lg border border-white/[0.08] px-2 py-1 text-[11px] text-zinc-300 hover:border-white/[0.16] hover:text-zinc-100"
                  >
                    Choose from Media
                  </button>
                ) : null}
                {r2Key ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProps({ ...block.props, storageId: "", r2Key: "", url: "" })
                    }
                    className="text-[11px] text-red-300 hover:text-red-200"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          );
        }

        if (field.kind === "boolean") {
          return (
            <InspectorRow key={field.id} label={field.label} growLabel>
              <InspectorSwitch
                checked={Boolean(value)}
                label={field.label}
                onChange={(next) =>
                  onUpdateProps({ ...block.props, [field.id]: next })
                }
              />
            </InspectorRow>
          );
        }

        if (field.kind === "datetime") {
          return (
            <InspectorRow key={field.id} label={field.label}>
              <DateTimePicker
                aria-label={field.label}
                value={String(value ?? "")}
                onChange={(next) =>
                  onUpdateProps({
                    ...block.props,
                    [field.id]: next,
                  })
                }
              />
            </InspectorRow>
          );
        }

        if (field.kind === "guild") {
          return (
            <InspectorRow key={field.id} label={field.label}>
              <GuildSelect
                siteId={siteId}
                value={String(value ?? "")}
                onChange={(next) =>
                  onUpdateProps({ ...block.props, [field.id]: next })
                }
              />
            </InspectorRow>
          );
        }

        if (field.kind === "select") {
          return (
            <InspectorRow key={field.id} label={field.label}>
              <Dropdown
                aria-label={field.label}
                variant="compact"
                value={String(value ?? field.options[0]?.value ?? "")}
                options={field.options}
                onChange={(next) =>
                  onUpdateProps({
                    ...block.props,
                    [field.id]:
                      field.id === "level" || field.id === "count"
                        ? Number(next)
                        : next,
                  })
                }
              />
            </InspectorRow>
          );
        }

        if (field.kind === "social-links") {
          const items = parseSocialLinkDrafts(
            "variable" in field && field.variable
              ? storageToDisplay(String(value ?? ""))
              : String(value ?? ""),
          );
          const writeItems = (nextItems: typeof items) => {
            const serialized = serializeSocialLinkDrafts(nextItems);
            onUpdateProps({
              ...block.props,
              [field.id]:
                "variable" in field && field.variable
                  ? displayToStorage(serialized)
                  : serialized,
            });
          };
          return (
            <div key={field.id} className="flex flex-col gap-2">
              <span className="text-[11px] text-zinc-400">{field.label}</span>
              {items.map((item, index) => (
                <div
                  key={`${field.id}-${index}`}
                  className="flex items-start gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-1.5"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <input
                      aria-label={`Link ${index + 1} name`}
                      placeholder="Name"
                      value={item.label}
                      onChange={(event) =>
                        writeItems(
                          updateSocialLinkDraft(items, index, {
                            label: event.target.value,
                          }),
                        )
                      }
                      className="site-builder-field site-builder-field-compact min-w-0"
                    />
                    <input
                      aria-label={`Link ${index + 1} URL`}
                      placeholder="https://"
                      value={item.href}
                      onChange={(event) =>
                        writeItems(
                          updateSocialLinkDraft(items, index, {
                            href: event.target.value,
                          }),
                        )
                      }
                      className="site-builder-field site-builder-field-compact min-w-0"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${item.label || `link ${index + 1}`}`}
                    onClick={() =>
                      writeItems(items.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.04] hover:text-red-300"
                  >
                    <i className="bx bx-trash text-sm" aria-hidden />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => writeItems([...items, { label: "", href: "" }])}
                className="rounded-lg border border-dashed border-white/[0.08] px-2 py-1.5 text-left text-[11px] text-zinc-400 hover:border-white/[0.16] hover:text-zinc-200"
              >
                Add link
              </button>
            </div>
          );
        }

        const displayValue =
          "variable" in field && field.variable
            ? storageToDisplay(String(value ?? ""))
            : String(value ?? "");

        if (field.kind === "textarea") {
          return (
            <label key={field.id} className="flex flex-col gap-1.5">
              <span className="text-[11px] text-zinc-400">{field.label}</span>
              <textarea
                value={displayValue}
                onChange={(event) =>
                  onUpdateProps({
                    ...block.props,
                    [field.id]:
                      "variable" in field && field.variable
                        ? displayToStorage(event.target.value)
                        : event.target.value,
                  })
                }
                rows={4}
                className="site-builder-field"
              />
            </label>
          );
        }

        return (
          <InspectorRow key={field.id} label={field.label}>
            <input
              value={displayValue}
              onChange={(event) =>
                onUpdateProps({
                  ...block.props,
                  [field.id]:
                    "variable" in field && field.variable
                      ? displayToStorage(event.target.value)
                      : event.target.value,
                })
              }
              className="site-builder-field site-builder-field-compact min-w-0 flex-1"
            />
          </InspectorRow>
        );
      })}
    </InspectorSection>
  );
}

function GuildSelect({
  siteId,
  value,
  onChange,
}: {
  siteId?: Id<"sites">;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = useQuery(
    api.siteCases.listGuildOptionsForSite,
    siteId ? { siteId } : "skip",
  );
  const list = [...(options ?? [])];
  if (value && !list.some((option) => option.value === value)) {
    list.unshift({ value, label: value, description: undefined });
  }

  if (options === undefined) {
    return <span className="text-[11px] text-zinc-500">Loading…</span>;
  }
  if (list.length === 0) {
    return <span className="text-[11px] text-zinc-500">No guilds linked</span>;
  }

  return (
    <Dropdown
      aria-label="Guild"
      variant="compact"
      value={value}
      placeholder="Select guild"
      options={list}
      onChange={onChange}
    />
  );
}
