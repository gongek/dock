"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

type MenuPlacement = "bottom" | "top";

type MenuMetrics = {
  left: number;
  top?: number;
  bottom?: number;
  minWidth: number;
  maxWidth: number;
  maxHeight: number;
  placement: MenuPlacement;
};

const MENU_GAP = 6;
const VIEWPORT_PAD = 8;
const CLOSE_MS = 180;
const TYPEAHEAD_MS = 420;

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  placeholder = "Select",
  variant = "field",
  disabled = false,
  matchTriggerWidth,
  minMenuWidth = 176,
  className = "",
  renderValue,
  menuAlign = "selected",
}: {
  value: T;
  options: Array<DropdownOption<T>>;
  onChange: (value: T) => void;
  "aria-label"?: string;
  placeholder?: string;
  variant?: "field" | "ghost" | "compact" | "inline";
  disabled?: boolean;
  matchTriggerWidth?: boolean;
  minMenuWidth?: number;
  className?: string;
  menuAlign?: "selected" | "start";
  renderValue?: (
    selected: DropdownOption<T> | undefined,
    open: boolean,
  ) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [metrics, setMetrics] = useState<MenuMetrics | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const searchRef = useRef("");
  const searchTimerRef = useRef<number>(0);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const highlightedOption = options[highlighted];
  const activeId = highlightedOption
    ? `${listId}-option-${highlighted}`
    : undefined;

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const updateMetrics = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const availableBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const availableAbove = rect.top - VIEWPORT_PAD;
    const preferTop =
      availableBelow < 160 && availableAbove > availableBelow;
    const placement: MenuPlacement = preferTop ? "top" : "bottom";
    const maxHeight = Math.max(
      120,
      Math.min(280, placement === "top" ? availableAbove - MENU_GAP : availableBelow - MENU_GAP),
    );
    const minWidth = Math.min(
      window.innerWidth - VIEWPORT_PAD * 2,
      Math.max(rect.width, matchTriggerWidth ? rect.width : minMenuWidth),
    );
    const maxWidth = window.innerWidth - VIEWPORT_PAD * 2;
    const measuredWidth = menuRef.current?.offsetWidth ?? minWidth;
    const left = Math.min(
      Math.max(VIEWPORT_PAD, rect.left),
      window.innerWidth - measuredWidth - VIEWPORT_PAD,
    );

    setMetrics({
      left,
      minWidth,
      maxWidth,
      maxHeight,
      placement,
      top: placement === "bottom" ? rect.bottom + MENU_GAP : undefined,
      bottom:
        placement === "top"
          ? window.innerHeight - rect.top + MENU_GAP
          : undefined,
    });
  }, [matchTriggerWidth, minMenuWidth]);

  useEffect(() => {
    if (!open) {
      const timeout = window.setTimeout(() => {
        setVisible(false);
        setMetrics(null);
      }, CLOSE_MS);
      return () => window.clearTimeout(timeout);
    }

    setVisible(true);
    setHighlighted(menuAlign === "start" ? 0 : selectedIndexRef.current);
    const frame = window.requestAnimationFrame(() => {
      updateMetrics();
      if (menuAlign === "start" && listRef.current) {
        listRef.current.scrollTop = 0;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [menuAlign, open, updateMetrics]);

  useLayoutEffect(() => {
    if (!open || !visible) return;
    updateMetrics();
    if (menuAlign === "start" && listRef.current) {
      listRef.current.scrollTop = 0;
    }
    const frame = window.requestAnimationFrame(() => {
      updateMetrics();
      if (menuAlign === "start" && listRef.current) {
        listRef.current.scrollTop = 0;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [menuAlign, open, updateMetrics, visible, options.length]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    }

    function onReposition() {
      updateMetrics();
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [close, open, updateMetrics]);

  useEffect(() => {
    if (!open || !visible) return;
    const list = listRef.current;
    const option = optionRefs.current[highlighted];
    if (!list || !option) return;
    const listRect = list.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();
    if (optionRect.bottom > listRect.bottom) {
      list.scrollTop += optionRect.bottom - listRect.bottom;
    } else if (optionRect.top < listRect.top) {
      list.scrollTop -= listRect.top - optionRect.top;
    }
  }, [highlighted, open, visible]);

  useEffect(() => {
    return () => window.clearTimeout(searchTimerRef.current);
  }, []);

  function moveHighlight(offset: number) {
    if (!options.length) return;
    setHighlighted((current) => {
      return (current + offset + options.length) % options.length;
    });
  }

  function commit(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close();
    triggerRef.current?.focus();
  }

  function typeahead(key: string) {
    if (key.length !== 1 || key === " ") return false;
    searchRef.current += key.toLowerCase();
    window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      searchRef.current = "";
    }, TYPEAHEAD_MS);
    const start = highlighted + 1;
    const ranked = options.map((option, index) => ({ option, index }));
    const ordered = ranked.slice(start).concat(ranked.slice(0, start));
    const match = ordered.find(({ option }) =>
      option.label.toLowerCase().startsWith(searchRef.current),
    );
    if (match) setHighlighted(match.index);
    return true;
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Home" && open) {
      event.preventDefault();
      setHighlighted(0);
      return;
    }

    if (event.key === "End" && open) {
      event.preventDefault();
      setHighlighted(Math.max(0, options.length - 1));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      if (open) {
        event.preventDefault();
        commit(highlighted);
      }
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "Tab" && open) {
      close();
      return;
    }

    if (open && typeahead(event.key)) {
      event.preventDefault();
    }
  }

  const triggerClassName =
    variant === "ghost"
      ? `flex max-w-52 items-center gap-1.5 rounded-lg px-2 py-1 text-left transition-colors ${
          open ? "bg-white/[0.05]" : "hover:bg-white/[0.04]"
        }`
      : variant === "inline"
        ? `flex items-center gap-0.5 text-left text-[12px] font-medium leading-5 ${
            open ? "text-zinc-100" : "text-zinc-200 hover:text-zinc-100"
          }`
      : variant === "compact"
        ? `site-builder-field site-builder-field-compact flex w-full items-center justify-between gap-1 text-left ${
            open ? "border-sky-400/55" : ""
          }`
        : `site-builder-field flex w-full items-center justify-between gap-2 text-left ${
            open ? "border-sky-400/55" : ""
          }`;

  const menuReady = visible && metrics !== null;
  const menuState = open && menuReady ? "open" : "closed";

  return (
    <div className={`relative min-w-0 ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-activedescendant={open ? activeId : undefined}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        onKeyDown={onTriggerKeyDown}
        className={triggerClassName}
      >
        {renderValue ? (
          renderValue(selected, open)
        ) : (
          <span className="min-w-0 truncate">
            {selected?.label ?? placeholder}
          </span>
        )}
        <i
          className={`bx bx-chevron-down shrink-0 text-zinc-500 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            variant === "inline" ? "text-[11px]" : "text-sm"
          } ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {visible && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              data-state={menuState}
              data-placement={metrics?.placement ?? "bottom"}
              className="ui-dropdown-menu fixed z-[60] overflow-hidden rounded-lg border border-white/[0.08] bg-[#0b0b0b] shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
              style={
                metrics
                  ? {
                      left: metrics.left,
                      width: "max-content",
                      minWidth: metrics.minWidth,
                      maxWidth: metrics.maxWidth,
                      top: metrics.top,
                      bottom: metrics.bottom,
                    }
                  : { visibility: "hidden" }
              }
            >
              <div
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label={ariaLabel}
                className="site-builder-scroll overflow-y-auto p-1"
                style={
                  metrics ? { maxHeight: metrics.maxHeight } : undefined
                }
              >
                {options.map((option, index) => {
                  const isSelected = option.value === value;
                  const isActive = index === highlighted;
                  return (
                    <button
                      key={option.value}
                      ref={(node) => {
                        optionRefs.current[index] = node;
                      }}
                      type="button"
                      role="option"
                      id={`${listId}-option-${index}`}
                      aria-selected={isSelected}
                      onPointerEnter={() => setHighlighted(index)}
                      onClick={() => commit(index)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors duration-100 ${
                        isActive
                          ? "bg-white/[0.08] text-zinc-100"
                          : "text-zinc-400"
                      }`}
                    >
                      <span className="flex min-w-0 items-baseline gap-1.5">
                        <span className="whitespace-nowrap text-[13px] font-medium leading-5">
                          {option.label}
                        </span>
                        {option.description ? (
                          <span className="whitespace-nowrap text-[11px] font-normal leading-5 text-zinc-500">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                      <i
                        className={`bx bx-check shrink-0 text-xs text-sky-400 transition-opacity duration-150 ${
                          isSelected ? "opacity-100" : "opacity-0"
                        }`}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
