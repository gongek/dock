import type { CSSProperties } from "react";

export const MIN_BLOCK_WIDTH = 48;
export const MIN_BLOCK_HEIGHT = 24;

export type BlockAlign = "left" | "center" | "right";
export type TextAlign = "left" | "center" | "right" | "justify";

function finiteNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function readTextAlign(props: Record<string, unknown>): TextAlign {
  const align = props.textAlign;
  if (align === "center" || align === "right" || align === "justify" || align === "left") {
    return align;
  }
  return "left";
}

export function readBlockAlign(props: Record<string, unknown>): BlockAlign {
  const align = props.boxAlign;
  if (align === "center" || align === "right" || align === "left") return align;
  return "left";
}

export function readBlockLayout(props: Record<string, unknown>): {
  width?: number;
  height?: number;
  offsetX: number;
  offsetY: number;
  align: BlockAlign;
} {
  const width = finiteNumber(props.boxWidth);
  const height = finiteNumber(props.boxHeight);
  const offsetX = finiteNumber(props.boxOffsetX);
  const offsetY = finiteNumber(props.boxOffsetY);
  return {
    width: width !== undefined && width > 0 ? width : undefined,
    height: height !== undefined && height > 0 ? height : undefined,
    offsetX: offsetX ?? 0,
    offsetY: offsetY ?? 0,
    align: readBlockAlign(props),
  };
}

function alignSelf(align: BlockAlign, hasFixedWidth: boolean): CSSProperties["alignSelf"] {
  if (!hasFixedWidth && align === "left") return undefined;
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
}

export function textAlignStyle(props: Record<string, unknown>): CSSProperties {
  const align = readTextAlign(props);
  if (align === "left") return {};
  if (align === "justify") {
    return {
      textAlign: "justify",
      textAlignLast: "justify",
    };
  }
  return { textAlign: align };
}

export function blockLayoutStyle(props: Record<string, unknown>): CSSProperties {
  const { width, height, offsetX, offsetY, align } = readBlockLayout(props);
  const style: CSSProperties = {};
  if (width !== undefined) {
    style.width = width;
    style.maxWidth = "100%";
  }
  if (height !== undefined) {
    style.height = height;
    style.minHeight = height;
  }
  const self = alignSelf(align, width !== undefined);
  if (self) style.alignSelf = self;
  Object.assign(style, textAlignStyle(props));
  if (offsetX) style.marginLeft = offsetX;
  if (offsetY) style.marginTop = offsetY;
  return style;
}

export function blockLayoutClassName(props: Record<string, unknown>): string {
  const { width, align } = readBlockLayout(props);
  if (width) return "min-w-0 max-w-full";
  if (align !== "left") return "min-w-0 w-fit max-w-full";
  return "min-w-0 w-full";
}

export function layoutToProps(
  props: Record<string, unknown>,
  layout: { width: number; height: number; offsetX: number },
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...props,
    boxWidth: Math.round(layout.width),
    boxHeight: Math.round(layout.height),
  };
  if (layout.offsetX > 0.5) next.boxOffsetX = Math.round(layout.offsetX);
  else delete next.boxOffsetX;
  return next;
}

export function writeBlockLayout(
  props: Record<string, unknown>,
  patch: {
    width?: number | null;
    height?: number | null;
    offsetX?: number | null;
    offsetY?: number | null;
    align?: BlockAlign;
  },
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...props };

  if (patch.width === null) delete next.boxWidth;
  else if (patch.width !== undefined) {
    next.boxWidth = Math.max(MIN_BLOCK_WIDTH, Math.round(patch.width));
  }

  if (patch.height === null) delete next.boxHeight;
  else if (patch.height !== undefined) {
    next.boxHeight = Math.max(MIN_BLOCK_HEIGHT, Math.round(patch.height));
  }

  if (patch.offsetX === null || patch.offsetX === 0) {
    if (patch.offsetX !== undefined) delete next.boxOffsetX;
  } else if (patch.offsetX !== undefined) {
    next.boxOffsetX = Math.round(patch.offsetX);
  }

  if (patch.offsetY === null || patch.offsetY === 0) {
    if (patch.offsetY !== undefined) delete next.boxOffsetY;
  } else if (patch.offsetY !== undefined) {
    next.boxOffsetY = Math.round(patch.offsetY);
  }

  if (patch.align !== undefined) {
    if (patch.align === "left") delete next.boxAlign;
    else next.boxAlign = patch.align;
  }

  return next;
}

const LEGACY_PADDING_PX: Record<string, number> = {
  sm: 16,
  md: 32,
  lg: 48,
};

export function readPaddingPx(value: unknown, fallback = 32): number {
  if (typeof value === "string" && value in LEGACY_PADDING_PX) {
    return LEGACY_PADDING_PX[value];
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

export type BoxPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export function readBoxPadding(props: Record<string, unknown>): BoxPadding {
  const vertical = readPaddingPx(props.padding, 32);
  const horizontal = readPaddingPx(props.paddingX, 0);
  return {
    top: readPaddingPx(props.paddingTop, vertical),
    right: readPaddingPx(props.paddingRight, horizontal),
    bottom: readPaddingPx(props.paddingBottom, vertical),
    left: readPaddingPx(props.paddingLeft, horizontal),
  };
}

export function boxPaddingStyle(padding: BoxPadding): CSSProperties {
  return {
    paddingTop: padding.top,
    paddingRight: padding.right,
    paddingBottom: padding.bottom,
    paddingLeft: padding.left,
  };
}

export function canvasScaleFromElement(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && element.offsetWidth > 0
    ? rect.width / element.offsetWidth
    : 1;
}
