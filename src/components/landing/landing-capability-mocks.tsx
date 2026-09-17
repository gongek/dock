export function EditorMock() {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-dashed border-white/[0.1] px-3 py-2">
        <p className="text-sm font-medium text-zinc-100">Appeals</p>
        <p className="text-[11px] text-zinc-500">Heading</p>
      </div>
      <div className="rounded-xl border border-white/[0.08] px-3 py-2">
        <p className="text-xs text-zinc-400">Cases table</p>
        <div className="mt-2 h-1.5 w-3/4 rounded bg-zinc-800" />
        <div className="mt-1.5 h-1.5 w-1/2 rounded bg-zinc-800" />
      </div>
      <div className="rounded-xl border border-white/[0.08] px-3 py-2">
        <p className="text-xs text-zinc-400">Rules</p>
        <div className="mt-2 h-1.5 w-full rounded bg-zinc-800" />
      </div>
    </div>
  );
}

export function DiscordSignInMock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-white/[0.08] px-3 py-2">
        <span className="text-xs text-zinc-300">Staff</span>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-950">
          Can edit
        </span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-white/[0.08] px-3 py-2">
        <span className="text-xs text-zinc-300">Members</span>
        <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-[11px] text-zinc-400">
          Can view
        </span>
      </div>
      <p className="text-[11px] text-zinc-500">Sign in with Discord. You choose who sees what.</p>
    </div>
  );
}

export function DomainMock() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2">
        <span className="size-1.5 rounded-full bg-emerald-400/80" />
        <p className="truncate font-mono text-xs text-zinc-300">appeals.aurora.gg</p>
      </div>
      <p className="px-1 text-[11px] text-zinc-500">
        Also live at{" "}
        <span className="font-mono text-zinc-400">aurora.dock.surf</span>
      </p>
    </div>
  );
}

export function CasesMock() {
  return (
    <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.08]">
      {[
        ["Appeal #4821", "Open"],
        ["Ticket #119", "Waiting"],
        ["Report #77", "Closed"],
      ].map(([label, status]) => (
        <li
          key={label}
          className="flex items-center justify-between px-3 py-2.5"
        >
          <span className="text-xs text-zinc-200">{label}</span>
          <span className="text-[11px] text-zinc-500">{status}</span>
        </li>
      ))}
    </ul>
  );
}
