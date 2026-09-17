import Link from "next/link";
import { SiteStatusChip } from "@/components/dashboard/site-status-chip";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { buildSiteEditUrl, formatSiteHost } from "@/lib/site-host";

function siteKindLabel(hostKind: "bot_subdomain" | "custom_slug") {
  return hostKind === "custom_slug" ? "Custom slug" : "Bot subdomain";
}

export type DashboardSiteListSite = {
  _id: string;
  title: string;
  slug: string;
  status: string;
  hostKind: "bot_subdomain" | "custom_slug";
  updatedAt: number;
};

export function DashboardSiteListItem({
  site,
  onOpen,
  opening,
}: {
  site: DashboardSiteListSite;
  onOpen: () => void;
  opening?: boolean;
}) {
  const editHref =
    site.hostKind === "custom_slug"
      ? `/dashboard/sites/${site._id}/edit`
      : buildSiteEditUrl({ siteId: site._id, slug: site.slug });

  const EditControl =
    site.hostKind === "custom_slug" ? (
      <Link href={editHref} className="dashboard-site-action">
        Edit
      </Link>
    ) : (
      <a href={editHref} className="dashboard-site-action">
        Edit
      </a>
    );

  return (
    <div className="dashboard-site-row">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium text-zinc-100">{site.title}</p>
          <SiteStatusChip status={site.status} />
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {formatSiteHost({ siteId: site._id, slug: site.slug })}
        </p>
        <p className="mt-0.5 text-xs text-zinc-600">
          {siteKindLabel(site.hostKind)} · {formatRelativeTime(site.updatedAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpen}
          disabled={opening}
          className="dashboard-site-action disabled:cursor-wait disabled:opacity-50"
        >
          {opening ? "Opening…" : "Open"}
        </button>
        {EditControl}
      </div>
    </div>
  );
}
