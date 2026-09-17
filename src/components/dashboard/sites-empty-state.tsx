import Link from "next/link";

export function SitesEmptyState({
  createBotSiteUrl,
  busy,
  atSiteLimit,
}: {
  createBotSiteUrl: string;
  busy: boolean;
  atSiteLimit: boolean;
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
          Link a Meridian bot to get a staff dashboard on your subdomain.
        </p>
        <Link
          href={createBotSiteUrl}
          className="landing-btn-primary mt-6 text-xs disabled:cursor-wait disabled:opacity-60"
          aria-disabled={busy || atSiteLimit}
          tabIndex={busy || atSiteLimit ? -1 : undefined}
          onClick={(event) => {
            if (busy || atSiteLimit) event.preventDefault();
          }}
        >
          Create bot site
        </Link>
      </div>
    </div>
  );
}
