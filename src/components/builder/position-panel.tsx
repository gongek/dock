"use client";

import { useEffect, useState } from "react";
import type { SiteBlock } from "@/lib/blocks/types";
import { isContainerBlock } from "@/lib/blocks/tree";
import {
  MIN_BLOCK_HEIGHT,
  MIN_BLOCK_WIDTH,
  readBlockLayout,
  readBoxPadding,
  readTextAlign,
  writeBlockLayout,
  type BoxPadding,
} from "@/lib/blocks/layout";
import { Dropdown } from "@/components/ui/dropdown";
import {
  InspectorIconBar,
  InspectorIconButton,
  InspectorRow,
  InspectorSection,
} from "@/components/builder/inspector-chrome";

export const LAYOUT_FIELD_IDS = new Set([
  "padding",
  "paddingX",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "gap",
  "align",
]);

const WIDTH_MODES = [
  { value: "fill", label: "Fill" },
  { value: "fixed", label: "Fixed" },
] as const;

const HEIGHT_MODES = [
  { value: "hug", label: "Hug" },
  { value: "fixed", label: "Fixed" },
] as const;

const SIZE_OPTIONS = [
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
];

function parseDim(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "." || trimmed === "-.") return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function AxisField({
  axis,
  value,
  ariaLabel,
  onCommit,
  onNudge,
}: {
  axis: string;
  value: string;
  ariaLabel: string;
  onCommit: (raw: string) => void;
  onNudge?: (delta: number) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <label className="site-builder-field site-builder-metric site-builder-field-compact min-w-0 flex-1">
      <input
        aria-label={ariaLabel}
        value={draft}
        placeholder="0"
        inputMode="decimal"
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (parseDim(next) !== undefined) onCommit(next);
        }}
        onBlur={() => onCommit(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
            return;
          }
          if (!onNudge) return;
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            onNudge((event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 10 : 1));
          }
        }}
      />
      <span className="site-builder-metric-suffix">{axis}</span>
    </label>
  );
}

function SizeField({
  value,
  placeholder,
  ariaLabel,
  disabled,
  onCommit,
  onNudge,
}: {
  value: string;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
  onCommit: (raw: string) => void;
  onNudge?: (delta: number) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <label
      className={`site-builder-field site-builder-metric site-builder-field-compact min-w-0 flex-1 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <input
        aria-label={ariaLabel}
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="decimal"
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (next.trim() === "") return;
          if (parseDim(next) !== undefined) onCommit(next);
        }}
        onBlur={() => onCommit(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
            return;
          }
          if (!onNudge) return;
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            onNudge((event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 10 : 1));
          }
        }}
      />
    </label>
  );
}

export function PositionPanel({
  block,
  onUpdateProps,
}: {
  block: SiteBlock;
  onUpdateProps: (props: Record<string, unknown>) => void;
}) {
  const layout = readBlockLayout(block.props);
  const widthMode = layout.width ? "fixed" : "fill";
  const heightMode = layout.height ? "fixed" : "hug";
  const showLayout = isContainerBlock(block.type);
  const contentAlign = String(block.props.align ?? "left");
  const gap = String(block.props.gap ?? "md");
  const padding = String(block.props.padding ?? "md");
  const boxPadding = readBoxPadding(block.props);
  const hasAlign = "align" in block.props || block.type === "section";
  const hasGap = "gap" in block.props || block.type === "group";
  const hasPadding = "padding" in block.props || block.type === "section" || block.type === "card";
  const pixelPadding = block.type === "section";

  function commit(patch: Parameters<typeof writeBlockLayout>[1]) {
    onUpdateProps(writeBlockLayout(block.props, patch));
  }

  function setProp(id: string, value: string) {
    onUpdateProps({ ...block.props, [id]: value });
  }

  function commitWidth(raw: string) {
    const parsed = parseDim(raw);
    if (parsed === undefined) {
      commit({ width: null });
      return;
    }
    commit({ width: Math.max(MIN_BLOCK_WIDTH, parsed) });
  }

  function commitHeight(raw: string) {
    const parsed = parseDim(raw);
    if (parsed === undefined) {
      commit({ height: null });
      return;
    }
    commit({ height: Math.max(MIN_BLOCK_HEIGHT, parsed) });
  }

  function commitBoxPadding(patch: Partial<BoxPadding>) {
    const next = { ...boxPadding, ...patch };
    onUpdateProps({
      ...block.props,
      paddingTop: next.top,
      paddingRight: next.right,
      paddingBottom: next.bottom,
      paddingLeft: next.left,
    });
  }

  function paddingField(
    side: keyof BoxPadding,
    axis: string,
    ariaLabel: string,
  ) {
    const value = boxPadding[side];
    return (
      <AxisField
        axis={axis}
        ariaLabel={ariaLabel}
        value={String(value)}
        onCommit={(raw) => {
          const parsed = parseDim(raw);
          commitBoxPadding({
            [side]: parsed === undefined ? 0 : Math.max(0, Math.round(parsed)),
          });
        }}
        onNudge={(delta) =>
          commitBoxPadding({ [side]: Math.max(0, value + delta) })
        }
      />
    );
  }

  return (
    <>
      <div className="border-b border-white/[0.07] px-3 py-3">
        <InspectorIconBar className="mb-2">
          <InspectorIconButton
            label="Align left"
            icon="bx-align-left"
            pressed={layout.align === "left"}
            onClick={() => commit({ align: "left" })}
          />
          <InspectorIconButton
            label="Align center"
            icon="bx-align-middle"
            pressed={layout.align === "center"}
            onClick={() => commit({ align: "center" })}
          />
          <InspectorIconButton
            label="Align right"
            icon="bx-align-right"
            pressed={layout.align === "right"}
            onClick={() => commit({ align: "right" })}
          />
        </InspectorIconBar>
        <div className="flex flex-col gap-1.5">
          <InspectorRow label="Position">
            <AxisField
              axis="X"
              ariaLabel="X offset"
              value={String(Math.round(layout.offsetX))}
              onCommit={(raw) => {
                const parsed = parseDim(raw);
                commit({ offsetX: parsed === undefined ? 0 : parsed });
              }}
              onNudge={(delta) => commit({ offsetX: layout.offsetX + delta })}
            />
            <AxisField
              axis="Y"
              ariaLabel="Y offset"
              value={String(Math.round(layout.offsetY))}
              onCommit={(raw) => {
                const parsed = parseDim(raw);
                commit({ offsetY: parsed === undefined ? 0 : parsed });
              }}
              onNudge={(delta) => commit({ offsetY: layout.offsetY + delta })}
            />
          </InspectorRow>
          <InspectorRow label="Width">
            <SizeField
              ariaLabel="Width"
              value={layout.width ? String(Math.round(layout.width)) : ""}
              placeholder={widthMode === "fill" ? "Fill" : "0"}
              onCommit={commitWidth}
              onNudge={
                layout.width
                  ? (delta) => commitWidth(String(layout.width! + delta))
                  : undefined
              }
            />
            <Dropdown
              aria-label="Width mode"
              variant="compact"
              className="w-[5.75rem] shrink-0"
              minMenuWidth={120}
              value={widthMode}
              options={[...WIDTH_MODES]}
              onChange={(mode) => {
                if (mode === "fill") commit({ width: null, align: "left" });
                else commit({ width: layout.width ?? 320 });
              }}
            />
          </InspectorRow>
          <InspectorRow label="Height">
            <SizeField
              ariaLabel="Height"
              value={layout.height ? String(Math.round(layout.height)) : ""}
              placeholder={heightMode === "hug" ? "Hug" : "0"}
              onCommit={commitHeight}
              onNudge={
                layout.height
                  ? (delta) => commitHeight(String(layout.height! + delta))
                  : undefined
              }
            />
            <Dropdown
              aria-label="Height mode"
              variant="compact"
              className="w-[5.75rem] shrink-0"
              minMenuWidth={120}
              value={heightMode}
              options={[...HEIGHT_MODES]}
              onChange={(mode) => {
                if (mode === "hug") commit({ height: null });
                else commit({ height: layout.height ?? 120 });
              }}
            />
          </InspectorRow>
        </div>
      </div>
      <InspectorSection title="Typography">
        <InspectorRow label="Align">
          <InspectorIconBar className="min-w-0 flex-1">
            <InspectorIconButton
              label="Align text left"
              icon="bx-align-left"
              pressed={readTextAlign(block.props) === "left"}
              onClick={() => {
                const next = { ...block.props };
                delete next.textAlign;
                onUpdateProps(next);
              }}
            />
            <InspectorIconButton
              label="Align text center"
              icon="bx-align-middle"
              pressed={readTextAlign(block.props) === "center"}
              onClick={() => setProp("textAlign", "center")}
            />
            <InspectorIconButton
              label="Align text right"
              icon="bx-align-right"
              pressed={readTextAlign(block.props) === "right"}
              onClick={() => setProp("textAlign", "right")}
            />
            <InspectorIconButton
              label="Justify text"
              icon="bx-align-justify"
              pressed={readTextAlign(block.props) === "justify"}
              onClick={() => {
                onUpdateProps(
                  writeBlockLayout(
                    { ...block.props, textAlign: "justify" },
                    { width: null, align: "left" },
                  ),
                );
              }}
            />
          </InspectorIconBar>
        </InspectorRow>
      </InspectorSection>
      {showLayout && (hasAlign || hasGap || hasPadding) ? (
        <InspectorSection title="Layout">
          {hasAlign ? (
            <InspectorRow label="Align">
              <InspectorIconBar className="min-w-0 flex-1">
                <InspectorIconButton
                  label="Content left"
                  icon="bx-align-left"
                  pressed={contentAlign !== "center" && contentAlign !== "right"}
                  onClick={() => setProp("align", "left")}
                />
                <InspectorIconButton
                  label="Content center"
                  icon="bx-align-middle"
                  pressed={contentAlign === "center"}
                  onClick={() => setProp("align", "center")}
                />
                <InspectorIconButton
                  label="Content right"
                  icon="bx-align-right"
                  pressed={contentAlign === "right"}
                  onClick={() => setProp("align", "right")}
                />
              </InspectorIconBar>
            </InspectorRow>
          ) : null}
          {hasGap ? (
            <InspectorRow label="Gap">
              <Dropdown
                aria-label="Gap"
                variant="compact"
                value={gap}
                options={SIZE_OPTIONS}
                onChange={(next) => setProp("gap", next)}
              />
            </InspectorRow>
          ) : null}
          {hasPadding ? (
            pixelPadding ? (
              <>
                <InspectorRow label="Padding">
                  {paddingField("top", "T", "Padding top")}
                  {paddingField("bottom", "B", "Padding bottom")}
                </InspectorRow>
                <InspectorRow label="Inside">
                  {paddingField("left", "L", "Inside padding left")}
                  {paddingField("right", "R", "Inside padding right")}
                </InspectorRow>
              </>
            ) : (
              <InspectorRow label="Padding">
                <Dropdown
                  aria-label="Padding"
                  variant="compact"
                  value={padding}
                  options={SIZE_OPTIONS}
                  onChange={(next) => setProp("padding", next)}
                />
              </InspectorRow>
            )
          ) : null}
        </InspectorSection>
      ) : null}
    </>
  );
}
