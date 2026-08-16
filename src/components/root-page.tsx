import { DockLogo } from "@/components/dock-logo";

export function RootPage() {
  return (
    <div className="flex flex-1 min-h-full flex-col">
      <div className="flex flex-1 items-center justify-center">
        <DockLogo className="w-56 h-auto" />
      </div>
      <p className="pb-6 text-center text-xs text-zinc-500">Coming soon</p>
    </div>
  );
}
