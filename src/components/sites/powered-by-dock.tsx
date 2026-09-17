const DOCK_HOME_URL = "https://dock.surf";

export function PoweredByDock({ interactive = true }: { interactive?: boolean }) {
  const className =
    "text-[11px] tracking-wide text-zinc-500 transition-colors hover:text-zinc-300";
  const label = "Powered by Dock.surf";

  return (
    <footer className="mt-auto px-6 py-5">
      <p className="text-center">
        {interactive ? (
          <a
            href={DOCK_HOME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {label}
          </a>
        ) : (
          <span className={className}>{label}</span>
        )}
      </p>
    </footer>
  );
}
