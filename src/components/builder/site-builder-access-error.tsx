"use client";

import { BuilderErrorScreen } from "@/components/builder/builder-error-screen";
import {
  siteEditorAccessErrorDetails,
  type SiteEditorAccessErrorCode,
} from "@/lib/site-editor-access-error";
import { buildDockHomeUrl, buildDockLoginUrl } from "@/lib/site-host";

export function SiteBuilderAccessError({
  error,
}: {
  error: SiteEditorAccessErrorCode;
}) {
  const details = siteEditorAccessErrorDetails[error];

  const actions =
    error === "not_authenticated"
      ? [
          {
            key: "sign-in",
            label: "Sign in to Dock",
            primary: true,
            onClick: () => {
              window.location.href = buildDockLoginUrl(window.location.href);
            },
          },
          {
            key: "home",
            label: "Go home",
            onClick: () => {
              window.location.href = buildDockHomeUrl();
            },
          },
        ]
      : [
          {
            key: "back",
            label: "Back to sites",
            primary: true,
            href: "/dashboard/sites",
          },
          {
            key: "home",
            label: "Go home",
            onClick: () => {
              window.location.href = buildDockHomeUrl();
            },
          },
        ];

  return (
    <BuilderErrorScreen
      title={details.title}
      message={details.message}
      actions={actions}
    />
  );
}
