"use client";

import { BuilderErrorScreen } from "@/components/builder/builder-error-screen";
import { buildDockHomeUrl } from "@/lib/site-host";

export function SiteAccessErrorPage({
  title = "Could not open site",
  message,
  slug,
}: {
  title?: string;
  message: string;
  slug?: string;
}) {
  return (
    <BuilderErrorScreen
      title={title}
      message={message}
      meta={slug ? `Site: ${slug}` : undefined}
      actions={[
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
      ]}
    />
  );
}
