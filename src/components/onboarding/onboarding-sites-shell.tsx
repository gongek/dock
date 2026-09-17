"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";

const STEPS = [
  { key: "link", label: "Connect Meridian" },
  { key: "config", label: "Configure" },
] as const;

export type OnboardingSitesStep = (typeof STEPS)[number]["key"];

export function OnboardingSitesProgress({
  activeStep,
}: {
  activeStep: OnboardingSitesStep;
}) {
  const activeIndex = STEPS.findIndex((step) => step.key === activeStep);

  return (
    <div className="mb-8">
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={activeIndex + 1}
        aria-label={`Step ${activeIndex + 1} of ${STEPS.length}`}
      >
        {STEPS.map((step, index) => {
          const filled = index <= activeIndex;
          return (
            <div
              key={step.key}
              className={`h-1 min-w-0 flex-1 rounded-full transition-colors duration-300 ${
                filled ? "bg-zinc-500" : "bg-zinc-800"
              }`}
              title={step.label}
            />
          );
        })}
      </div>
    </div>
  );
}

function OnboardingSitesSessionBadge() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.currentUser);

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  const displayName = user.name?.trim() || "Account";

  return (
    <div
      className="flex max-w-[55%] items-center justify-end gap-2"
      aria-label={`Signed in as ${displayName}`}
    >
      <span className="truncate text-xs text-zinc-400">{displayName}</span>
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-full"
        />
      ) : (
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400"
          aria-hidden
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export function OnboardingSitesShell({
  activeStep,
  title,
  subtitle,
  children,
}: {
  activeStep: OnboardingSitesStep;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip">
      <main className="flex flex-1 flex-col">
        <section className="relative flex min-h-[100svh] flex-col px-6 py-16">
          <div className="relative z-10 mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center justify-between gap-4">
              <Link
                href="https://dock.surf"
                className="inline-flex shrink-0 items-center gap-2 text-xs text-zinc-400 transition-colors hover:text-zinc-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/dock-logo.svg" alt="" width={24} height={24} />
                Dock
              </Link>
              <OnboardingSitesSessionBadge />
            </div>
            <OnboardingSitesProgress activeStep={activeStep} />
            <div className="landing-card landing-card--static p-8 sm:p-10">
              <h1 className="text-lg font-medium tracking-tight text-zinc-100">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-sm leading-6 text-zinc-500">{subtitle}</p>
              ) : null}
              <div className={subtitle ? "mt-5" : "mt-6"}>{children}</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
