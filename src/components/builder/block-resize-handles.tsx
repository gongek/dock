"use client";

import { useEffect, useRef } from "react";
import {
  MIN_BLOCK_HEIGHT,
  MIN_BLOCK_WIDTH,
  canvasScaleFromElement,
  layoutToProps,
  readBlockLayout,
} from "@/lib/blocks/layout";

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

const CORNERS: ResizeCorner[] = ["nw", "ne", "sw", "se"];

function nextLayout(
  session: {
    corner: ResizeCorner;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startOffsetX: number;
    parentWidth: number;
    scale: number;
    aspect: number;
  },
  event: PointerEvent,
) {
  const dx = (event.clientX - session.startX) / session.scale;
  const dy = (event.clientY - session.startY) / session.scale;
  const fromWest = session.corner === "nw" || session.corner === "sw";
  const fromNorth = session.corner === "nw" || session.corner === "ne";

  let width = fromWest ? session.startWidth - dx : session.startWidth + dx;
  let height = fromNorth ? session.startHeight - dy : session.startHeight + dy;
  let offsetX = fromWest ? session.startOffsetX + dx : session.startOffsetX;

  if (event.shiftKey && session.aspect > 0) {
    if (Math.abs(width - session.startWidth) >= Math.abs(height - session.startHeight)) {
      height = width / session.aspect;
    } else {
      width = height * session.aspect;
      if (fromWest) offsetX = session.startOffsetX + (session.startWidth - width);
    }
  }

  if (width < MIN_BLOCK_WIDTH) {
    if (fromWest) offsetX -= MIN_BLOCK_WIDTH - width;
    width = MIN_BLOCK_WIDTH;
  }
  if (height < MIN_BLOCK_HEIGHT) height = MIN_BLOCK_HEIGHT;
  if (offsetX < 0) {
    width = Math.max(MIN_BLOCK_WIDTH, width + offsetX);
    offsetX = 0;
  }
  if (offsetX + width > session.parentWidth) {
    width = Math.max(MIN_BLOCK_WIDTH, session.parentWidth - offsetX);
  }

  return { width, height, offsetX };
}

export function BlockResizeHandles({
  blockRef,
  props,
  onDraft,
  onCommit,
}: {
  blockRef: React.RefObject<HTMLElement | null>;
  props: Record<string, unknown>;
  onDraft: (nextProps: Record<string, unknown>) => void;
  onCommit: (nextProps: Record<string, unknown>) => void;
}) {
  const sessionRef = useRef<{
    corner: ResizeCorner;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startOffsetX: number;
    parentWidth: number;
    scale: number;
    aspect: number;
    props: Record<string, unknown>;
  } | null>(null);
  const latestDraft = useRef<Record<string, unknown> | null>(null);
  const draftRef = useRef(onDraft);
  const commitRef = useRef(onCommit);
  draftRef.current = onDraft;
  commitRef.current = onCommit;

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const session = sessionRef.current;
      if (!session) return;
      event.preventDefault();
      const next = layoutToProps(session.props, nextLayout(session, event));
      latestDraft.current = next;
      draftRef.current(next);
    }

    function onUp() {
      if (!sessionRef.current) return;
      sessionRef.current = null;
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("cursor");
      if (latestDraft.current) {
        commitRef.current(latestDraft.current);
        latestDraft.current = null;
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function startResize(corner: ResizeCorner, event: React.PointerEvent<HTMLButtonElement>) {
    const element = blockRef.current;
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();

    const layout = readBlockLayout(props);
    const startWidth = layout.width ?? element.offsetWidth;
    const startHeight = layout.height ?? element.offsetHeight;

    sessionRef.current = {
      corner,
      startX: event.clientX,
      startY: event.clientY,
      startWidth,
      startHeight,
      startOffsetX: layout.offsetX,
      parentWidth:
        element.closest(".builder-block-list")?.clientWidth ||
        element.parentElement?.parentElement?.clientWidth ||
        element.parentElement?.clientWidth ||
        startWidth,
      scale: canvasScaleFromElement(element),
      aspect: startHeight > 0 ? startWidth / startHeight : 1,
      props,
    };
    latestDraft.current = null;
    document.body.style.userSelect = "none";
    document.body.style.cursor =
      corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize";
  }

  return (
    <div className="builder-selection-handles">
      {CORNERS.map((corner) => (
        <button
          key={corner}
          type="button"
          className={`builder-resize-handle builder-resize-handle-${corner}`}
          aria-label={`Resize ${corner}`}
          onPointerDown={(event) => startResize(corner, event)}
          onClick={(event) => event.stopPropagation()}
        />
      ))}
    </div>
  );
}
