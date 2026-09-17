import type { ReactNode } from "react";
import { useFloatingTooltip } from "@/components/ui/floating-tooltip";

const EXPLAINER_CARD_CLASS =
  "max-w-[14rem] whitespace-normal font-normal leading-5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]";

export function InspectorExplainer({
  content,
  label = "More info",
  placement = "left",
}: {
  content: ReactNode;
  label?: string;
  placement?: "top" | "right" | "left";
}) {
  const { showTooltip, hideTooltip, portal } = useFloatingTooltip({
    contentClassName: EXPLAINER_CARD_CLASS,
    preferPlacement: placement,
    estimatedSize: { width: 224, height: 72 },
  });

  return (
    <>
      <button
        type="button"
        aria-label={label}
        className="flex size-3.5 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:text-zinc-300 focus-visible:text-zinc-300"
        onMouseEnter={(event) => showTooltip(content, event.currentTarget)}
        onMouseLeave={hideTooltip}
        onFocus={(event) => showTooltip(content, event.currentTarget)}
        onBlur={hideTooltip}
      >
        <i className="bx bx-info-circle text-[11px] leading-none" aria-hidden />
      </button>
      {portal}
    </>
  );
}

export function InspectorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-white/[0.07] px-3 py-3">
      <div className="mb-2 flex items-center gap-1">
        <p className="text-[11px] font-medium text-zinc-400">{title}</p>
        {description ? (
          <InspectorExplainer content={description} label={`About ${title}`} />
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

export function InspectorSubsection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <p className="text-[11px] font-medium text-zinc-400">{title}</p>
        {hint ? <InspectorExplainer content={hint} label={`About ${title}`} /> : null}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

export function InspectorRow({
  label,
  hint,
  children,
  growLabel = false,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  growLabel?: boolean;
}) {
  return (
    <div className="flex min-h-7 items-center gap-2">
      {growLabel ? (
        <span
          className="flex min-w-0 flex-1 items-center gap-0.5 text-[11px] leading-tight text-zinc-400"
          title={label}
        >
          <span className="min-w-0 truncate">{label}</span>
          {hint ? <InspectorExplainer content={hint} label={`About ${label}`} /> : null}
        </span>
      ) : (
        <span className="flex w-[4.5rem] shrink-0 items-center gap-0.5">
          <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-400" title={label}>
            {label}
          </span>
          {hint ? <InspectorExplainer content={hint} label={`About ${label}`} /> : null}
        </span>
      )}
      <div
        className={
          growLabel
            ? "flex shrink-0 items-center"
            : "flex min-w-0 flex-1 items-center gap-1"
        }
      >
        {children}
      </div>
    </div>
  );
}

export function InspectorIconBar({
  children,
  className = "",
  onMouseLeave,
}: {
  children: ReactNode;
  className?: string;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-px rounded-lg border border-white/[0.07] bg-white/[0.02] p-0.5 ${className}`.trim()}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

export function InspectorSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative ml-auto h-5 w-8 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
        checked ? "bg-sky-400" : "bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${
          checked ? "left-3.5" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function InspectorIconButton({
  label,
  icon,
  pressed,
  onClick,
  onHover,
}: {
  label: string;
  icon: string;
  pressed?: boolean;
  onClick: () => void;
  onHover?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onMouseEnter={() => onHover?.()}
      onClick={onClick}
      className={`flex size-7 flex-1 items-center justify-center rounded-md ${
        pressed
          ? "bg-white/[0.08] text-zinc-100"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
      }`}
    >
      <i className={`bx ${icon} text-sm`} aria-hidden />
    </button>
  );
}
