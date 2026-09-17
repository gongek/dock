"use client";

import type { SiteAccessSettings } from "@/lib/site-access";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { InspectorSwitch } from "@/components/builder/inspector-chrome";

const ACCESS_OPTIONS = [
  ["allowCollaborators", "Collaborators"],
  ["allowGuildAdministrators", "Guild admins"],
  ["allowManageServer", "Manage Server"],
] as const;

export function StaffAccessSettings({
  siteId,
  settings,
  canEdit,
}: {
  siteId: Id<"sites">;
  settings: SiteAccessSettings;
  canEdit: boolean;
}) {
  const updateSettings = useMutation(api.sites.updateSiteAccessSettings);

  if (!canEdit) return null;

  return (
    <div className="flex flex-col gap-1">
      {ACCESS_OPTIONS.map(([key, label]) => (
        <div key={key} className="flex min-h-8 items-center gap-3">
          <span className="min-w-0 flex-1 text-[13px] text-zinc-200">{label}</span>
          <InspectorSwitch
            checked={settings[key]}
            label={label}
            onChange={(next) => {
              void updateSettings({
                siteId,
                accessSettings: {
                  ...settings,
                  [key]: next,
                },
              });
            }}
          />
        </div>
      ))}
    </div>
  );
}
