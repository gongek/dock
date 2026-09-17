"use client";

import { AppErrorScreen } from "@/components/app-error-screen";

export default function AppError(_props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppErrorScreen />;
}
