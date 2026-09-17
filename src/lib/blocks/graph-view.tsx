"use client";

import { useState, type ReactNode } from "react";

const CHART_COLORS = [
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#fb7185",
  "#94a3b8",
];

export type GraphKind = "line" | "area" | "bar" | "donut" | "pie";

export type GraphPoint = {
  label: string;
  value: number;
};

function splitGraphEntries(raw: string): string[] {
  const entries: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!trimmed.includes(",")) {
      entries.push(trimmed);
      continue;
    }

    const parts = trimmed.split(/\s*,\s*/).filter(Boolean);
    if (!trimmed.includes("|")) {
      entries.push(...parts);
      continue;
    }

    const merged: string[] = [];
    for (const part of parts) {
      if (part.includes("|") || merged.length === 0) {
        merged.push(part);
      } else {
        merged[merged.length - 1] += `,${part}`;
      }
    }
    entries.push(...merged);
  }

  return entries;
}

export function parseGraphPoints(raw: string): GraphPoint[] {
  return splitGraphEntries(raw)
    .map((entry) => {
      if (entry.includes("|")) {
        const [label, ...rest] = entry.split("|").map((cell) => cell.trim());
        const value = Number(rest.join("|").replace(/,/g, ""));
        if (!label || !Number.isFinite(value)) return null;
        return { label, value };
      }

      const value = Number(entry.replace(/,/g, ""));
      if (!Number.isFinite(value)) return null;
      return { label: entry, value };
    })
    .filter((point): point is GraphPoint => point !== null);
}

export function GraphView({
  title,
  kind,
  points,
}: {
  title?: ReactNode;
  kind: GraphKind;
  points: GraphPoint[];
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-4 text-center text-xs text-zinc-500">
        Add chart values in the inspector
      </div>
    );
  }

  const radial = kind === "donut" || kind === "pie";

  return (
    <div className="flex flex-col gap-3">
      {title ? <p className="text-sm font-medium text-zinc-200">{title}</p> : null}
      {radial ? (
        <RadialChart kind={kind} points={points} />
      ) : (
        <CartesianChart kind={kind} points={points} />
      )}
    </div>
  );
}

function CartesianChart({
  kind,
  points,
}: {
  kind: Exclude<GraphKind, "donut" | "pie">;
  points: GraphPoint[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 400;
  const height = 180;
  const values = points.map((point) => point.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const ticks = 4;
  const tickLabels = Array.from({ length: ticks + 1 }, (_, index) =>
    formatTick(max - (span / ticks) * index),
  );
  const longestTick = Math.max(...tickLabels.map((label) => label.length), 1);
  const pad = {
    top: 12,
    right: 12,
    bottom: 28,
    left: Math.min(80, Math.max(36, 10 + longestTick * 6.2)),
  };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const coords = points.map((point, index) => {
    const x =
      kind === "bar"
        ? pad.left + (innerW / points.length) * (index + 0.5)
        : points.length === 1
          ? pad.left + innerW / 2
          : pad.left + index * step;
    const y = pad.top + innerH - ((point.value - min) / span) * innerH;
    return { ...point, x, y };
  });
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${pad.left},${pad.top + innerH} ${line} ${pad.left + innerW},${pad.top + innerH}`;
  const active = hover === null ? null : coords[hover];

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          onMouseLeave={() => setHover(null)}
        >
          {Array.from({ length: ticks + 1 }, (_, index) => {
            const y = pad.top + (innerH / ticks) * index;
            return (
              <g key={y}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y}
                  y2={y}
                  stroke="#27272a"
                  strokeWidth="1"
                />
                <text
                  x={pad.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-zinc-500"
                  fontSize="9"
                >
                  {tickLabels[index]}
                </text>
              </g>
            );
          })}
          {kind === "area" ? (
            <polygon points={area} fill="#38bdf8" fillOpacity="0.16" />
          ) : null}
          {active && kind !== "bar" ? (
            <line
              x1={active.x}
              x2={active.x}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke="#52525b"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          ) : null}
          {kind === "bar"
            ? coords.map((point, index) => {
                const barW = Math.max(8, innerW / points.length - 10);
                const barH = pad.top + innerH - point.y;
                const dimmed = hover !== null && hover !== index;
                return (
                  <rect
                    key={`${point.label}-${index}`}
                    x={point.x - barW / 2}
                    y={point.y}
                    width={barW}
                    height={Math.max(barH, 0)}
                    rx="4"
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    opacity={dimmed ? 0.35 : 1}
                    className="transition-opacity duration-150"
                  />
                );
              })
            : (
              <>
                <polyline
                  points={line}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {coords.map((point, index) => {
                  const activePoint = hover === index;
                  return (
                    <g key={`${point.label}-${point.x}`}>
                      {activePoint ? (
                        <circle cx={point.x} cy={point.y} r="8" fill="#38bdf8" fillOpacity="0.18" />
                      ) : null}
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={activePoint ? 5 : 3}
                        fill="#38bdf8"
                        className="transition-[r] duration-150"
                      />
                    </g>
                  );
                })}
              </>
            )}
          {coords.map((point, index) => (
            <text
              key={`label-${point.label}-${index}`}
              x={point.x}
              y={height - 8}
              textAnchor="middle"
              className={hover === index ? "fill-zinc-200" : "fill-zinc-500"}
              fontSize="9"
            >
              {point.label}
            </text>
          ))}
          {coords.map((point, index) => {
            const prev = coords[index - 1];
            const next = coords[index + 1];
            const left = prev ? (prev.x + point.x) / 2 : pad.left;
            const right = next ? (point.x + next.x) / 2 : width - pad.right;
            return (
              <rect
                key={`hit-${point.label}-${index}`}
                x={left}
                y={pad.top}
                width={Math.max(right - left, 1)}
                height={innerH}
                fill={kind === "bar" && hover === index ? "rgba(255,255,255,0.04)" : "transparent"}
                className="cursor-pointer"
                onMouseEnter={() => setHover(index)}
              />
            );
          })}
        </svg>
      </div>
      {active ? (
        <ChartTooltip
          label={active.label}
          value={formatPointValue(active.value)}
          xPercent={(active.x / width) * 100}
          yPercent={(active.y / height) * 100}
        />
      ) : null}
    </div>
  );
}

function RadialChart({
  kind,
  points,
}: {
  kind: "donut" | "pie";
  points: GraphPoint[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = points.reduce((sum, point) => sum + Math.max(point.value, 0), 0) || 1;
  const cx = 80;
  const cy = 80;
  const outer = 68;
  const inner = kind === "donut" ? 42 : 0;
  let angle = 0;
  const slices = points.map((point, index) => {
    const portion = Math.max(point.value, 0) / total;
    const start = angle;
    const sweep = portion * 360;
    angle += sweep;
    const mid = start + sweep / 2;
    const [tipX, tipY] = polar(cx, cy, (outer + inner) / 2 || outer * 0.62, mid);
    return {
      ...point,
      color: CHART_COLORS[index % CHART_COLORS.length],
      start,
      end: start + sweep,
      portion,
      tipX,
      tipY,
    };
  });
  const active = hover === null ? null : slices[hover];

  return (
    <div className="relative flex flex-wrap items-center gap-6 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
      <div className="relative size-40 shrink-0">
        <svg
          viewBox="0 0 160 160"
          className="size-40"
          role="img"
          onMouseLeave={() => setHover(null)}
        >
          {slices.map((slice, index) => (
            <path
              key={`${slice.label}-${slice.start}`}
              d={slicePath(cx, cy, outer, inner, slice.start, slice.end)}
              fill={slice.color}
              opacity={hover !== null && hover !== index ? 0.35 : 1}
              className="cursor-pointer transition-opacity duration-150"
              onMouseEnter={() => setHover(index)}
            />
          ))}
        </svg>
        {active ? (
          <ChartTooltip
            label={active.label}
            value={formatPointValue(active.value)}
            extra={`${Math.round(active.portion * 100)}%`}
            xPercent={(active.tipX / 160) * 100}
            yPercent={(active.tipY / 160) * 100}
          />
        ) : null}
      </div>
      <ul className="flex min-w-40 flex-col gap-1">
        {slices.map((slice, index) => (
          <li key={`${slice.label}-${index}`}>
            <button
              type="button"
              className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm text-zinc-300 transition-colors ${
                hover === index ? "bg-white/[0.06] text-zinc-100" : "hover:bg-white/[0.04]"
              }`}
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="min-w-0 flex-1 truncate">{slice.label}</span>
              <span className="tabular-nums text-zinc-500">
                {Math.round(slice.portion * 100)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartTooltip({
  label,
  value,
  extra,
  xPercent,
  yPercent,
}: {
  label: string;
  value: string;
  extra?: string;
  xPercent: number;
  yPercent: number;
}) {
  const flipX = xPercent > 70;
  const flipY = yPercent < 28;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-zinc-950 px-2.5 py-1.5 shadow-xl"
      style={{
        left: `${xPercent}%`,
        top: `${yPercent}%`,
        transform: `translate(${flipX ? "calc(-100% - 10px)" : "10px"}, ${
          flipY ? "10px" : "calc(-100% - 10px)"
        })`,
      }}
    >
      <p className="text-[11px] font-medium text-zinc-100">{label}</p>
      <p className="text-[11px] tabular-nums text-zinc-400">
        {value}
        {extra ? ` · ${extra}` : ""}
      </p>
    </div>
  );
}

function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

function slicePath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string {
  const sweep = Math.max(end - start, 0);
  if (sweep >= 359.99) {
    if (inner <= 0) {
      return `M ${cx - outer} ${cy} A ${outer} ${outer} 0 1 1 ${cx + outer} ${cy} A ${outer} ${outer} 0 1 1 ${cx - outer} ${cy} Z`;
    }
    return [
      `M ${cx - outer} ${cy}`,
      `A ${outer} ${outer} 0 1 1 ${cx + outer} ${cy}`,
      `A ${outer} ${outer} 0 1 1 ${cx - outer} ${cy}`,
      `M ${cx - inner} ${cy}`,
      `A ${inner} ${inner} 0 1 0 ${cx + inner} ${cy}`,
      `A ${inner} ${inner} 0 1 0 ${cx - inner} ${cy}`,
      "Z",
    ].join(" ");
  }

  const [ox1, oy1] = polar(cx, cy, outer, start);
  const [ox2, oy2] = polar(cx, cy, outer, end);
  const large = sweep > 180 ? 1 : 0;
  if (inner <= 0) {
    return `M ${cx} ${cy} L ${ox1} ${oy1} A ${outer} ${outer} 0 ${large} 1 ${ox2} ${oy2} Z`;
  }
  const [ix2, iy2] = polar(cx, cy, inner, end);
  const [ix1, iy1] = polar(cx, cy, inner, start);
  return [
    `M ${ox1} ${oy1}`,
    `A ${outer} ${outer} 0 ${large} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1}`,
    "Z",
  ].join(" ");
}

function formatTick(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const compact = (n: number, suffix: string) => {
    const rounded = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${sign}${text}${suffix}`;
  };
  if (abs >= 1e12) return compact(abs / 1e12, "T");
  if (abs >= 1e9) return compact(abs / 1e9, "B");
  if (abs >= 1e6) return compact(abs / 1e6, "M");
  if (abs >= 1e3) return compact(abs / 1e3, "k");
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function formatPointValue(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
