import { DockLogo } from "@/components/dock-logo";
import { SiteFooter } from "@/components/site-footer";

export function RootPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center">
        <DockLogo className="h-auto w-56" />
      </div>
      <SiteFooter />
    </div>
  );
}
