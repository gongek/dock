"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type MenuPlacement = "bottom" | "top";

type MenuMetrics = {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  placement: MenuPlacement;
};

const MENU_GAP = 6;
const VIEWPORT_PAD = 8;
const MENU_CLOSE_MS = 180;
const MODAL_CLOSE_MS = 220;
const MENU_WIDTH = 240;

export function ConfirmMenu({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  busy = false,
  anchor,
  matchAnchorWidth = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  busy?: boolean;
  anchor: HTMLElement | null;
  matchAnchorWidth?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [metrics, setMetrics] = useState<MenuMetrics | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const copyRef = useRef({
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant,
    matchAnchorWidth,
  });
  const anchorRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  if (open) {
    copyRef.current = {
      title,
      description,
      confirmLabel,
      cancelLabel,
      variant,
      matchAnchorWidth,
    };
    anchorRef.current = anchor;
  }
  const copy = copyRef.current;
  const positionedAnchor = open ? anchor : anchorRef.current;
  const isModal = positionedAnchor === null;

  const updateMetrics = useCallback(() => {
    const target = positionedAnchor;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const availableBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const availableAbove = rect.top - VIEWPORT_PAD;
    const placement: MenuPlacement =
      availableBelow < 140 && availableAbove > availableBelow ? "top" : "bottom";
    const width = copyRef.current.matchAnchorWidth
      ? Math.min(rect.width, window.innerWidth - VIEWPORT_PAD * 2)
      : Math.min(MENU_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);
    const left = copyRef.current.matchAnchorWidth
      ? Math.min(
          Math.max(VIEWPORT_PAD, rect.left),
          window.innerWidth - width - VIEWPORT_PAD,
        )
      : Math.min(
          Math.max(VIEWPORT_PAD, rect.right - width),
          window.innerWidth - width - VIEWPORT_PAD,
        );

    setMetrics({
      left,
      width,
      placement,
      top: placement === "bottom" ? rect.bottom + MENU_GAP : undefined,
      bottom:
        placement === "top"
          ? window.innerHeight - rect.top + MENU_GAP
          : undefined,
    });
  }, [positionedAnchor]);

  const closeMs = isModal ? MODAL_CLOSE_MS : MENU_CLOSE_MS;

  useEffect(() => {
    if (!open) {
      const timeout = window.setTimeout(() => {
        setVisible(false);
        setMetrics(null);
      }, closeMs);
      return () => window.clearTimeout(timeout);
    }

    setVisible(true);
    const frame = window.requestAnimationFrame(() => {
      if (!isModal) updateMetrics();
      confirmRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [closeMs, open, updateMetrics, isModal]);

  useLayoutEffect(() => {
    if (!open || !visible || isModal) return;
    updateMetrics();
  }, [open, visible, updateMetrics, isModal]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (isModal) return;
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (
        !copyRef.current.matchAnchorWidth &&
        positionedAnchor?.contains(target)
      ) {
        return;
      }
      onCancel();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }

    function onReposition() {
      if (!isModal) updateMetrics();
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [isModal, positionedAnchor, onCancel, open, updateMetrics]);

  const menuReady = visible && (isModal || metrics !== null);
  const menuState = open && menuReady ? "open" : "closed";

  if (!visible || typeof document === "undefined") return null;

  const actions = (
    <div className={isModal ? "mt-5 flex justify-end gap-2" : "mt-3 flex justify-end gap-1.5"}>
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className={
          isModal
            ? "rounded-lg px-3 py-1.5 text-[12px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-40"
            : "rounded-md px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-40"
        }
      >
        {copy.cancelLabel}
      </button>
      <button
        ref={confirmRef}
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={onConfirm}
        className={`font-medium transition-colors disabled:opacity-40 ${
          isModal ? "rounded-lg px-3 py-1.5 text-[12px]" : "rounded-md px-2.5 py-1 text-[11px]"
        } ${busy ? "min-w-[3.25rem]" : ""} ${
          copy.variant === "danger"
            ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
            : isModal
              ? "bg-zinc-100 text-zinc-900 hover:bg-white"
              : "bg-white/[0.08] text-zinc-100 hover:bg-white/[0.12]"
        }`}
      >
        {busy ? (
          <span className="ui-confirm-busy-dots inline-block tracking-[0.2em]" aria-hidden="true">
            •••
          </span>
        ) : (
          copy.confirmLabel
        )}
      </button>
    </div>
  );

  if (isModal) {
    return createPortal(
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <button
          type="button"
          aria-label={copy.cancelLabel}
          disabled={busy}
          data-state={menuState}
          className="ui-confirm-backdrop absolute inset-0 bg-black/65"
          onClick={onCancel}
        />
        <div
          ref={menuRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={copy.description ? descriptionId : undefined}
          data-state={menuState}
          className="ui-confirm-dialog relative z-10 w-full max-w-sm overflow-hidden rounded-xl border border-white/[0.1] bg-[#0b0b0b] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.65)]"
        >
          <p id={titleId} className="text-[15px] font-semibold leading-6 text-zinc-50">
            {copy.title}
          </p>
          {copy.description ? (
            <p
              id={descriptionId}
              className="mt-2 text-[13px] leading-5 text-zinc-400"
            >
              {copy.description}
            </p>
          ) : null}
          {actions}
        </div>
      </div>,
      document.body,
    );
  }

  const menu = (
    <div
      ref={menuRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={copy.description ? descriptionId : undefined}
      data-state={menuState}
      data-placement={metrics?.placement ?? "bottom"}
      className="ui-dropdown-menu fixed z-[70] overflow-hidden rounded-lg border border-white/[0.08] bg-[#0b0b0b] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
      style={
        metrics
          ? {
              left: metrics.left,
              width: metrics.width,
              top: metrics.top,
              bottom: metrics.bottom,
            }
          : { visibility: "hidden" }
      }
    >
      <p id={titleId} className="text-[13px] font-medium leading-5 text-zinc-100">
        <span className="block truncate">{copy.title}</span>
      </p>
      {copy.description ? (
        <p
          id={descriptionId}
          className="mt-1 text-[11px] leading-4 text-zinc-500"
        >
          {copy.description}
        </p>
      ) : null}
      {actions}
    </div>
  );

  return createPortal(menu, document.body);
}
