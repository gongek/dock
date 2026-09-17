"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Dropdown } from "@/components/ui/dropdown";

type MenuPlacement = "bottom" | "top";

type MenuMetrics = {
  left: number;
  top?: number;
  bottom?: number;
  placement: MenuPlacement;
};

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const MENU_GAP = 6;
const VIEWPORT_PAD = 8;
const CLOSE_MS = 180;
const MENU_WIDTH = 268;
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, month) => ({
  value: String(month),
  label: new Date(2020, month, 1).toLocaleString(undefined, { month: "long" }),
}));

function yearOptions(year: number, todayYear: number) {
  const start = Math.min(year, todayYear) - 20;
  const end = Math.max(year, todayYear) + 50;
  const options = [];
  for (let value = start; value <= end; value += 1) {
    options.push({ value: String(value), label: String(value) });
  }
  return options;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function addMonths(year: number, month: number, delta: number) {
  const next = new Date(year, month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

function clampToMonth(parts: DateTimeParts, year: number, month: number): DateTimeParts {
  return {
    ...parts,
    year,
    month,
    day: Math.min(parts.day, daysInMonth(year, month)),
  };
}

function sameDay(a: DateTimeParts, b: DateTimeParts) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function parseDateTimeValue(value: unknown): DateTimeParts | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?)?/,
  );
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hour = Number(match[4] ?? 0);
    const minute = Number(match[5] ?? 0);
    if (
      Number.isFinite(year) &&
      month >= 0 &&
      month <= 11 &&
      day >= 1 &&
      day <= daysInMonth(year, month)
    ) {
      return {
        year,
        month,
        day,
        hour: clamp(hour, 0, 23),
        minute: clamp(minute, 0, 59),
      };
    }
  }

  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return null;
  const date = new Date(parsed);
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

export function formatDateTimeValue(parts: DateTimeParts) {
  return `${parts.year}-${pad(parts.month + 1)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:00`;
}

function formatTriggerLabel(parts: DateTimeParts | null) {
  if (!parts) return "Pick a date";
  return new Date(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
  ).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildCalendarDays(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const count = daysInMonth(year, month);
  const previous = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  const previousCount = daysInMonth(previous.year, previous.month);
  const cells: Array<DateTimeParts & { outside: boolean }> = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({
      year: previous.year,
      month: previous.month,
      day: previousCount - firstWeekday + index + 1,
      hour: 0,
      minute: 0,
      outside: true,
    });
  }

  for (let day = 1; day <= count; day += 1) {
    cells.push({
      year,
      month,
      day,
      hour: 0,
      minute: 0,
      outside: false,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      year: next.year,
      month: next.month,
      day: nextDay,
      hour: 0,
      minute: 0,
      outside: true,
    });
    nextDay += 1;
  }

  return cells;
}

function TimeDigit({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(pad(value));

  useEffect(() => {
    setDraft(pad(value));
  }, [value]);

  return (
    <input
      aria-label={label}
      inputMode="numeric"
      value={draft}
      onChange={(event) => {
        const next = event.target.value.replace(/\D/g, "").slice(0, 2);
        setDraft(next);
        if (next.length === 2) {
          onChange(clamp(Number(next), 0, max));
        }
      }}
      onBlur={() => {
        const parsed = Number(draft);
        const next = Number.isFinite(parsed) ? clamp(parsed, 0, max) : value;
        onChange(next);
        setDraft(pad(next));
      }}
      className="site-builder-field site-builder-field-compact w-10 px-0 text-center tabular-nums"
    />
  );
}

export function DateTimePicker({
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
}) {
  const selected = parseDateTimeValue(value);
  const today = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
  }, []);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [metrics, setMetrics] = useState<MenuMetrics | null>(null);
  const [view, setView] = useState(() => ({
    year: selected?.year ?? today.year,
    month: selected?.month ?? today.month,
  }));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const gridId = useId();

  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const updateMetrics = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 320;
    const availableBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const availableAbove = rect.top - VIEWPORT_PAD;
    const preferTop =
      availableBelow < menuHeight && availableAbove > availableBelow;
    const placement: MenuPlacement = preferTop ? "top" : "bottom";
    const width = Math.min(MENU_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);
    const left = Math.min(
      Math.max(VIEWPORT_PAD, rect.right - width),
      window.innerWidth - width - VIEWPORT_PAD,
    );

    setMetrics({
      left,
      placement,
      top: placement === "bottom" ? rect.bottom + MENU_GAP : undefined,
      bottom:
        placement === "top"
          ? window.innerHeight - rect.top + MENU_GAP
          : undefined,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      const timeout = window.setTimeout(() => {
        setVisible(false);
        setMetrics(null);
      }, CLOSE_MS);
      return () => window.clearTimeout(timeout);
    }

    setVisible(true);
    const current = selectedRef.current;
    setView({
      year: current?.year ?? today.year,
      month: current?.month ?? today.month,
    });
    const frame = window.requestAnimationFrame(() => {
      updateMetrics();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, today.month, today.year, updateMetrics]);

  useLayoutEffect(() => {
    if (!open || !visible) return;
    updateMetrics();
    const frame = window.requestAnimationFrame(() => updateMetrics());
    return () => window.cancelAnimationFrame(frame);
  }, [open, updateMetrics, view.month, view.year, visible]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest(".ui-dropdown-menu")) return;
      close();
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      const nestedOpen = Array.from(
        document.querySelectorAll(".ui-dropdown-menu[data-state='open']"),
      ).some((node) => node !== menuRef.current);
      if (nestedOpen) return;
      event.preventDefault();
      close();
      triggerRef.current?.focus();
    }

    function onReposition() {
      updateMetrics();
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
  }, [close, open, updateMetrics]);

  useEffect(() => {
    if (!open || !visible) return;
    if (document.activeElement instanceof HTMLInputElement) return;
    const selectedButton = menuRef.current?.querySelector<HTMLButtonElement>(
      '[aria-selected="true"]',
    );
    selectedButton?.focus();
  }, [open, selected?.day, selected?.month, selected?.year, visible]);

  const days = useMemo(
    () => buildCalendarDays(view.year, view.month),
    [view.month, view.year],
  );
  const monthLabel = new Date(view.year, view.month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  function commit(next: DateTimeParts) {
    onChange(formatDateTimeValue(next));
  }

  function applyCalendar(year: number, month: number) {
    const next = clampToMonth(
      selected ?? { ...today, hour: 0, minute: 0 },
      year,
      month,
    );
    setView({ year: next.year, month: next.month });
    commit(next);
  }

  function selectDay(day: DateTimeParts) {
    const next = {
      year: day.year,
      month: day.month,
      day: day.day,
      hour: selected?.hour ?? 0,
      minute: selected?.minute ?? 0,
    };
    commit(next);
    setView({ year: day.year, month: day.month });
  }

  function shiftDay(offset: number) {
    const base = selected ?? {
      ...today,
      hour: 0,
      minute: 0,
    };
    const nextDate = new Date(
      base.year,
      base.month,
      base.day + offset,
      base.hour,
      base.minute,
    );
    const next = {
      year: nextDate.getFullYear(),
      month: nextDate.getMonth(),
      day: nextDate.getDate(),
      hour: base.hour,
      minute: base.minute,
    };
    commit(next);
    setView({ year: next.year, month: next.month });
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    }
  }

  const menuReady = visible && metrics !== null;
  const menuState = open && menuReady ? "open" : "closed";

  return (
    <div className="relative min-w-0 flex-1">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
        className={`site-builder-field site-builder-field-compact flex w-full items-center justify-between gap-1 text-left ${
          open ? "border-sky-400/55" : ""
        }`}
      >
        <span className="min-w-0 truncate">{formatTriggerLabel(selected)}</span>
        <i className="bx bx-calendar shrink-0 text-sm text-zinc-500" aria-hidden />
      </button>

      {visible && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={dialogId}
              role="dialog"
              tabIndex={-1}
              aria-label={ariaLabel ?? "Choose date"}
              data-state={menuState}
              data-placement={metrics?.placement ?? "bottom"}
              className="ui-dropdown-menu fixed z-[60] w-[268px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#0b0b0b] p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
              onKeyDown={(event) => {
                if (event.defaultPrevented) return;
                if (event.target instanceof HTMLInputElement) return;
                if (event.target instanceof HTMLElement && event.target.closest('[role="listbox"]')) {
                  return;
                }
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  shiftDay(-1);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  shiftDay(1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  shiftDay(-7);
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  shiftDay(7);
                }
              }}
              style={
                metrics
                  ? {
                      left: metrics.left,
                      top: metrics.top,
                      bottom: metrics.bottom,
                    }
                  : { visibility: "hidden" }
              }
            >
              <div className="mb-2 flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setView((current) => addMonths(current.year, current.month, -1))}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                >
                  <i className="bx bx-chevron-left text-lg" aria-hidden />
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                  <Dropdown
                    aria-label="Month"
                    variant="inline"
                    minMenuWidth={132}
                    menuAlign="start"
                    value={String(view.month)}
                    options={MONTH_OPTIONS}
                    onChange={(next) => applyCalendar(view.year, Number(next))}
                  />
                  <Dropdown
                    aria-label="Year"
                    variant="inline"
                    minMenuWidth={76}
                    className="tabular-nums"
                    value={String(view.year)}
                    options={yearOptions(view.year, today.year)}
                    onChange={(next) => applyCalendar(Number(next), view.month)}
                  />
                </div>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setView((current) => addMonths(current.year, current.month, 1))}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                >
                  <i className="bx bx-chevron-right text-lg" aria-hidden />
                </button>
              </div>

              <div
                id={gridId}
                role="grid"
                aria-label={monthLabel}
                className="grid grid-cols-7 gap-px"
              >
                {WEEKDAYS.map((day) => (
                  <span
                    key={day}
                    className="pb-1 text-center text-[10px] font-medium tracking-wide text-zinc-500"
                  >
                    {day}
                  </span>
                ))}
                {days.map((day) => {
                  const isSelected = selected ? sameDay(selected, day) : false;
                  const isToday = sameDay(today, day);
                  return (
                    <button
                      key={`${day.year}-${day.month}-${day.day}`}
                      type="button"
                      role="gridcell"
                      aria-selected={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={new Date(
                        day.year,
                        day.month,
                        day.day,
                      ).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      onClick={() => selectDay(day)}
                      className={`flex size-8 items-center justify-center rounded-md text-[12px] tabular-nums transition-colors ${
                        isSelected
                          ? "bg-sky-400 text-zinc-950"
                          : isToday
                            ? "text-sky-300 hover:bg-white/[0.06]"
                            : day.outside
                              ? "text-zinc-600 hover:bg-white/[0.04] hover:text-zinc-300"
                              : "text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100"
                      }`}
                    >
                      {day.day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center gap-2 border-t border-white/[0.07] pt-2">
                <span className="text-[11px] text-zinc-400">Time</span>
                <div className="ml-auto flex items-center gap-1">
                  <TimeDigit
                    label="Hours"
                    value={selected?.hour ?? 0}
                    max={23}
                    onChange={(hour) =>
                      commit({
                        year: selected?.year ?? view.year,
                        month: selected?.month ?? view.month,
                        day: selected?.day ?? 1,
                        hour,
                        minute: selected?.minute ?? 0,
                      })
                    }
                  />
                  <span className="text-[11px] text-zinc-500">:</span>
                  <TimeDigit
                    label="Minutes"
                    value={selected?.minute ?? 0}
                    max={59}
                    onChange={(minute) =>
                      commit({
                        year: selected?.year ?? view.year,
                        month: selected?.month ?? view.month,
                        day: selected?.day ?? 1,
                        hour: selected?.hour ?? 0,
                        minute,
                      })
                    }
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
