"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { ConvexRuntimeErrorBoundary } from "@/components/convex-runtime-error-boundary";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      <ConvexRuntimeErrorBoundary>{children}</ConvexRuntimeErrorBoundary>
    </ConvexAuthNextjsProvider>
  );
}
