"use client";

import { AppErrorScreen } from "@/components/app-error-screen";

export default function GlobalError(_props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-full flex-col font-sans">
        <AppErrorScreen />
      </body>
    </html>
  );
}
