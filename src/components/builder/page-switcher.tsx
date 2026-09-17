"use client";

import { Dropdown } from "@/components/ui/dropdown";
import type { Id } from "../../../convex/_generated/dataModel";

export function PageSwitcher({
  pages,
  pageId,
  onSelectPage,
}: {
  pages: Array<{ _id: Id<"sitePages">; slug: string; title: string; kind: string }>;
  pageId: Id<"sitePages">;
  onSelectPage: (pageId: Id<"sitePages">) => void;
}) {
  return (
    <Dropdown
      variant="ghost"
      aria-label="Pages"
      value={pageId}
      minMenuWidth={168}
      options={pages.map((page) => ({
        value: page._id,
        label: page.title,
        description: `/${page.slug}`,
      }))}
      onChange={onSelectPage}
      renderValue={(selected) => (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-100">
            {selected?.label ?? "Page"}
          </span>
        </span>
      )}
    />
  );
}
