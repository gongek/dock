export function LandingProductPreview() {
  return (
    <div className="landing-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <span className="size-2 rounded-full bg-zinc-700" />
        <span className="size-2 rounded-full bg-zinc-700" />
        <span className="size-2 rounded-full bg-zinc-700" />
        <p className="ml-2 truncate font-mono text-[11px] text-zinc-500">
          aurora.dock.surf/appeals
        </p>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-[11px] tracking-wide text-zinc-500 uppercase">Staff</p>
          <h3 className="mt-1 text-lg font-medium tracking-tight text-zinc-100">
            Appeals
          </h3>
        </div>
        <div className="overflow-hidden rounded-xl border border-white/[0.06]">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-white/[0.06] px-3 py-2 text-[11px] text-zinc-500">
            <span>Case</span>
            <span>Status</span>
            <span>Opened</span>
          </div>
          {[
            ["Ban appeal · 4821", "Open", "2h"],
            ["Mute appeal · 4816", "Review", "1d"],
            ["Report · 4802", "Closed", "3d"],
          ].map(([caseName, status, opened]) => (
            <div
              key={caseName}
              className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-white/[0.04] px-3 py-2.5 last:border-b-0"
            >
              <span className="truncate text-sm text-zinc-200">{caseName}</span>
              <span className="text-xs text-zinc-400">{status}</span>
              <span className="text-xs text-zinc-500">{opened}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/[0.06] px-3 py-3">
          <p className="text-xs font-medium text-zinc-300">Server rules</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Be respectful. No raids. Appeals go through this page, not DMs.
          </p>
        </div>
      </div>
    </div>
  );
}
