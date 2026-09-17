export function SitesEmptyState({
  onOpenOnboarding,
  busy,
}: {
  onOpenOnboarding: () => void;
  busy: boolean;
}) {
  return (
    <div className="relative rounded-xl bg-zinc-900/60 px-6 py-14 text-center">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 size-full"
      >
        <rect
          x={1}
          y={1}
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx={11}
          ry={11}
          fill="none"
          stroke="rgb(63 63 70 / 0.8)"
          strokeWidth={2}
          strokeDasharray="8 6"
        />
      </svg>
      <div className="relative z-0 flex flex-col items-center">
        <h3 className="text-sm font-medium text-zinc-200">No sites yet</h3>
        <p className="mt-2 max-w-sm text-center text-xs leading-5 text-zinc-500">
          Click the button below to link a Meridian bot and start creating your
          very own bot dashboard.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onOpenOnboarding}
          className="mt-6 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-wait disabled:opacity-60"
        >
          Create dashboard
        </button>
      </div>
    </div>
  );
}
