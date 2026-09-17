"use client";

import { BuilderErrorScreen } from "@/components/builder/builder-error-screen";
import { buildDockHomeUrl } from "@/lib/site-host";

export function AppErrorScreen({
  title = "Something went wrong",
  message = "Please try again.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <BuilderErrorScreen
      title={title}
      message={message}
      actions={[
        {
          key: "home",
          label: "Go home",
          primary: true,
          onClick: () => {
            window.location.href = buildDockHomeUrl();
          },
        },
      ]}
    />
  );
}
