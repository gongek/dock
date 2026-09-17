"use client";

import Link from "next/link";

export type BuilderErrorAction = {
  key: string;
  label: string;
  primary?: boolean;
} & (
  | { href: string; onClick?: never }
  | { onClick: () => void; href?: never }
);

function BuilderErrorButton({ action }: { action: BuilderErrorAction }) {
  const className = action.primary
    ? "w-full rounded-lg bg-zinc-100 px-3.5 py-2 text-xs font-medium text-zinc-950 transition-colors hover:bg-white"
    : "w-full rounded-lg border border-white/[0.08] px-3.5 py-2 text-xs text-zinc-400 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-zinc-200";

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

export function BuilderErrorScreen({
  title,
  message,
  meta,
  actions,
  showHeader = true,
}: {
  title: string;
  message: string;
  meta?: string;
  actions: BuilderErrorAction[];
  showHeader?: boolean;
}) {
  return (
    <div className="site-builder flex h-screen flex-col overflow-hidden bg-[#090909] text-zinc-100">
      {showHeader ? (
        <header className="site-builder-surface flex h-12 shrink-0 items-center border-b border-white/[0.07] px-3">
          <Link
            href="/dashboard/sites"
            className="flex items-center gap-2 rounded-lg py-1 pr-2 text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
            aria-label="Back to sites"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dock-logo.svg" alt="" width={22} height={22} className="size-5 shrink-0" />
            <span className="text-sm font-medium tracking-wide text-zinc-100">Dock</span>
          </Link>
        </header>
      ) : null}
      <div className="site-builder-canvas flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 py-8 text-center">
          <h1 className="text-sm font-medium text-zinc-100">{title}</h1>
          <p className="mt-2 text-[11px] leading-5 text-zinc-400">{message}</p>
          {meta ? <p className="mt-3 text-[11px] text-zinc-500">{meta}</p> : null}
          {actions.length > 0 ? (
            <div className="mt-6 flex flex-col gap-2">
              {actions.map((action) => (
                <BuilderErrorButton key={action.key} action={action} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
