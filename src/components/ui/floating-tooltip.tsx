"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

type FloatingTooltipState = {
  content: ReactNode;
  anchor: DOMRect;
  placement: TooltipPlacement;
  x: number;
  y: number;
};

export type FloatingTooltipOptions = {
  contentClassName?: string;
  preferPlacement?: "top" | "right" | "left";
  estimatedSize?: { width: number; height: number };
};

export const FLOATING_TOOLTIP_CLASS =
  "pointer-events-none fixed z-50 rounded-lg border border-white/10 bg-zinc-950 px-2 py-1 text-[11px] font-medium text-zinc-200 motion-reduce:transition-none [transition:transform_200ms_ease-out,opacity_200ms_ease-out]";

const VIEWPORT_PAD = 8;
const TOOLTIP_GAP = 8;

function placementOrder(prefer: "top" | "right" | "left"): TooltipPlacement[] {
  switch (prefer) {
    case "top":
      return ["top", "bottom", "left", "right"];
    case "left":
      return ["left", "right", "top", "bottom"];
    default:
      return ["right", "left", "top", "bottom"];
  }
}

function anchorPoint(placement: TooltipPlacement, anchor: DOMRect) {
  switch (placement) {
    case "top":
      return { x: anchor.left + anchor.width / 2, y: anchor.top };
    case "bottom":
      return { x: anchor.left + anchor.width / 2, y: anchor.bottom };
    case "left":
      return { x: anchor.left, y: anchor.top + anchor.height / 2 };
    case "right":
      return { x: anchor.right, y: anchor.top + anchor.height / 2 };
  }
}

function tooltipBounds(
  placement: TooltipPlacement,
  point: { x: number; y: number },
  size: { width: number; height: number },
) {
  switch (placement) {
    case "top":
      return {
        left: point.x - size.width / 2,
        top: point.y - size.height - TOOLTIP_GAP,
        right: point.x + size.width / 2,
        bottom: point.y - TOOLTIP_GAP,
      };
    case "bottom":
      return {
        left: point.x - size.width / 2,
        top: point.y + TOOLTIP_GAP,
        right: point.x + size.width / 2,
        bottom: point.y + TOOLTIP_GAP + size.height,
      };
    case "left":
      return {
        left: point.x - size.width - TOOLTIP_GAP,
        top: point.y - size.height / 2,
        right: point.x - TOOLTIP_GAP,
        bottom: point.y + size.height / 2,
      };
    case "right":
      return {
        left: point.x + TOOLTIP_GAP,
        top: point.y - size.height / 2,
        right: point.x + TOOLTIP_GAP + size.width,
        bottom: point.y + size.height / 2,
      };
  }
}

function fitsViewport(bounds: ReturnType<typeof tooltipBounds>) {
  return (
    bounds.left >= VIEWPORT_PAD &&
    bounds.top >= VIEWPORT_PAD &&
    bounds.right <= window.innerWidth - VIEWPORT_PAD &&
    bounds.bottom <= window.innerHeight - VIEWPORT_PAD
  );
}

function clampPoint(
  placement: TooltipPlacement,
  point: { x: number; y: number },
  size: { width: number; height: number },
) {
  const bounds = tooltipBounds(placement, point, size);
  let { x, y } = point;

  if (bounds.left < VIEWPORT_PAD) {
    x += VIEWPORT_PAD - bounds.left;
  }
  if (bounds.right > window.innerWidth - VIEWPORT_PAD) {
    x -= bounds.right - (window.innerWidth - VIEWPORT_PAD);
  }
  if (bounds.top < VIEWPORT_PAD) {
    y += VIEWPORT_PAD - bounds.top;
  }
  if (bounds.bottom > window.innerHeight - VIEWPORT_PAD) {
    y -= bounds.bottom - (window.innerHeight - VIEWPORT_PAD);
  }

  return { x, y };
}

function resolvePlacement(
  anchor: DOMRect,
  size: { width: number; height: number },
  prefer: "top" | "right" | "left",
): { placement: TooltipPlacement; x: number; y: number } {
  for (const placement of placementOrder(prefer)) {
    const point = anchorPoint(placement, anchor);
    const bounds = tooltipBounds(placement, point, size);
    if (fitsViewport(bounds)) {
      return { placement, ...point };
    }
  }

  const placement = prefer === "top" ? "top" : prefer === "left" ? "left" : "right";
  const point = clampPoint(placement, anchorPoint(placement, anchor), size);
  return { placement, ...point };
}

function defaultEstimatedSize(prefer: "top" | "right" | "left") {
  switch (prefer) {
    case "top":
      return { width: 192, height: 44 };
    case "left":
      return { width: 224, height: 72 };
    default:
      return { width: 120, height: 28 };
  }
}

function hideMotionOffset(placement: TooltipPlacement) {
  switch (placement) {
    case "top":
      return 6;
    case "bottom":
      return -6;
    case "left":
      return 6;
    case "right":
      return -6;
  }
}

function tooltipTransform(placement: TooltipPlacement, motionOffset: number) {
  switch (placement) {
    case "top":
      return `translate(-50%, calc(-100% - ${TOOLTIP_GAP}px + ${motionOffset}px))`;
    case "bottom":
      return `translate(-50%, calc(${TOOLTIP_GAP}px + ${motionOffset}px))`;
    case "left":
      return `translate(calc(-100% - ${TOOLTIP_GAP}px + ${motionOffset}px), -50%)`;
    case "right":
      return `translate(calc(${TOOLTIP_GAP}px + ${motionOffset}px), -50%)`;
  }
}

function normalizeOptions(
  options?: FloatingTooltipOptions | string,
): FloatingTooltipOptions {
  if (typeof options === "string") {
    return { contentClassName: options, preferPlacement: "right" };
  }
  return {
    contentClassName: options?.contentClassName ?? "whitespace-nowrap",
    preferPlacement: options?.preferPlacement ?? "right",
    estimatedSize: options?.estimatedSize,
  };
}

function placementMatches(
  current: FloatingTooltipState,
  resolved: { placement: TooltipPlacement; x: number; y: number },
) {
  return (
    resolved.placement === current.placement &&
    resolved.x === current.x &&
    resolved.y === current.y
  );
}

export function useFloatingTooltip(options?: FloatingTooltipOptions | string) {
  const { contentClassName, preferPlacement, estimatedSize } = normalizeOptions(options);
  const prefer = preferPlacement ?? "right";
  const [tooltip, setTooltip] = useState<FloatingTooltipState | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [motionOffset, setMotionOffset] = useState(6);
  const hadTooltipRef = useRef(false);
  const hideTimeoutRef = useRef<number | null>(null);
  const pendingAnimateRef = useRef(false);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const animateIn = useCallback((placement: TooltipPlacement) => {
    setMotionOffset(hideMotionOffset(placement));
    setIsVisible(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
        setMotionOffset(0);
      });
    });
  }, []);

  const showTooltip = useCallback(
    (content: ReactNode, element: HTMLElement) => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      const anchor = element.getBoundingClientRect();
      const estimated = estimatedSize ?? defaultEstimatedSize(prefer);
      const resolved = resolvePlacement(anchor, estimated, prefer);
      const nextTooltip: FloatingTooltipState = {
        content,
        anchor,
        ...resolved,
      };

      const isFirstShow = !hadTooltipRef.current;
      hadTooltipRef.current = true;

      if (isFirstShow) {
        pendingAnimateRef.current = true;
        setTooltip(nextTooltip);
        setIsVisible(false);
        return;
      }

      setTooltip(nextTooltip);
      setMotionOffset(0);
      setIsVisible(true);
    },
    [estimatedSize, prefer],
  );

  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) return;
    const size = tooltipRef.current.getBoundingClientRect();
    if (size.width === 0 || size.height === 0) return;

    const resolved = resolvePlacement(
      tooltip.anchor,
      { width: size.width, height: size.height },
      prefer,
    );

    if (!placementMatches(tooltip, resolved)) {
      setTooltip((current) =>
        current
          ? {
              ...current,
              placement: resolved.placement,
              x: resolved.x,
              y: resolved.y,
            }
          : current,
      );
      return;
    }

    if (pendingAnimateRef.current) {
      pendingAnimateRef.current = false;
      animateIn(resolved.placement);
    }
  }, [tooltip, prefer, animateIn]);

  const hideTooltip = useCallback(() => {
    pendingAnimateRef.current = false;
    setIsVisible(false);
    setTooltip((current) => {
      if (current) {
        setMotionOffset(hideMotionOffset(current.placement));
      }
      return current;
    });
    hadTooltipRef.current = false;
    hideTimeoutRef.current = window.setTimeout(() => {
      setTooltip(null);
      hideTimeoutRef.current = null;
    }, 200);
  }, []);

  const portal =
    tooltip && typeof document !== "undefined"
      ? createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            aria-hidden={!isVisible}
            className={`${FLOATING_TOOLTIP_CLASS} ${contentClassName}`}
            style={{
              left: tooltip.x,
              top: tooltip.y,
              opacity: isVisible ? 1 : 0,
              transform: tooltipTransform(tooltip.placement, motionOffset),
            }}
          >
            {tooltip.content}
          </span>,
          document.body,
        )
      : null;

  return { showTooltip, hideTooltip, portal };
}

export function FloatingTooltipHost({
  className,
  contentClassName,
  preferPlacement = "right",
  children,
}: {
  className?: string;
  contentClassName?: string;
  preferPlacement?: "top" | "right" | "left";
  children: (api: {
    showTooltip: (content: ReactNode, element: HTMLElement) => void;
    hideTooltip: () => void;
  }) => ReactNode;
}) {
  const { showTooltip, hideTooltip, portal } = useFloatingTooltip({
    contentClassName,
    preferPlacement,
  });

  return (
    <div className={className} onMouseLeave={hideTooltip}>
      {children({ showTooltip, hideTooltip })}
      {portal}
    </div>
  );
}
