import { Suspense } from "react";
import { SitesDashboardPage } from "@/components/dashboard/sites-page";

export default function DashboardSitesPage() {
  return (
    <Suspense fallback={<p className="px-8 py-8 text-xs text-zinc-600">Loading sites…</p>}>
      <SitesDashboardPage />
    </Suspense>
  );
}
