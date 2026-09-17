"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { MeridianLogoIcon } from "@/components/oauth-icons";
import {
  buildSiteEditUrl,
  formatSiteHost,
  formatSiteHostPreview,
} from "@/lib/site-host";
import { userFacingError } from "@/lib/user-facing-error";

export type MeridianBotChoice = {
  meridianBotId: string;
  label: string;
  name: string;
  linkedGuildId?: string;
};

type BotLinkingState = {
  meridianConnected: boolean;
  bots: MeridianBotChoice[];
  error?: string;
};

type OnboardingStep =
  | "welcome"
  | "connect"
  | "link"
  | "choose"
  | "confirm"
  | "success";

function resolveStep(
  state: BotLinkingState,
  resume: boolean,
): OnboardingStep {
  if (!resume) return "welcome";
  if (!state.meridianConnected) return "connect";
  if (state.bots.length === 0) return "link";
  if (state.bots.length === 1) return "confirm";
  return "choose";
}

function stepNumber(step: OnboardingStep): number {
  switch (step) {
    case "welcome":
      return 1;
    case "connect":
      return 2;
    case "link":
      return 3;
    case "choose":
      return 4;
    case "confirm":
      return 5;
    case "success":
      return 6;
  }
}

function StepIndicator({ step }: { step: OnboardingStep }) {
  if (step === "success") return null;

  const labels: Record<Exclude<OnboardingStep, "success">, string> = {
    welcome: "Welcome",
    connect: "Connect Meridian",
    link: "Link a bot",
    choose: "Choose bot",
    confirm: "Confirm site",
  };

  return (
    <p className="text-xs text-zinc-500">
      Step {stepNumber(step)} · {labels[step]}
    </p>
  );
}

export function CreateDashboardOnboarding({
  open,
  resume,
  sessionId,
  onClose,
}: {
  open: boolean;
  resume: boolean;
  sessionId: number;
  onClose: () => void;
}) {
  const { signIn } = useAuthActions();
  const getBotLinkingState = useAction(api.meridian.onboarding.getBotLinkingState);
  const createBotSite = useMutation(api.sites.createBotSite);

  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [linkingState, setLinkingState] = useState<BotLinkingState | null>(
    null,
  );
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("");
  const [createdSite, setCreatedSite] = useState<{
    siteId: string;
    slug: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMeridian, setPendingMeridian] = useState(false);

  const selectedBot =
    linkingState?.bots.find((bot) => bot.meridianBotId === selectedBotId) ??
    null;

  const loadState = useCallback(
    async (shouldResume: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const state = await getBotLinkingState({});
        setLinkingState(state);
        setStep(resolveStep(state, shouldResume));
        if (state.bots.length === 1) {
          setSelectedBotId(state.bots[0].meridianBotId);
          setSiteTitle(state.bots[0].name);
        }
        if (state.error && state.bots.length === 0) {
          setError(
            userFacingError(
              state.error,
              "Could not load Meridian bot information.",
            ),
          );
        }
      } catch (cause) {
        setError(
          userFacingError(cause, "Could not load Meridian bot information."),
        );
      } finally {
        setBusy(false);
      }
    },
    [getBotLinkingState],
  );

  useEffect(() => {
    if (!open || sessionId === 0) return;
    queueMicrotask(() => {
      void loadState(resume);
    });
  }, [open, resume, sessionId, loadState]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  async function handleMeridianSignIn() {
    setPendingMeridian(true);
    setError(null);
    try {
      await signIn("meridian", {
        redirectTo: `${window.location.origin}/dashboard/sites?onboarding=1`,
      });
    } catch (cause) {
      setError(userFacingError(cause, "Could not start Meridian sign-in."));
      setPendingMeridian(false);
    }
  }

  async function handleCreateSite() {
    if (!selectedBot) return;

    setBusy(true);
    setError(null);
    try {
      const siteId = await createBotSite({
        meridianBotId: selectedBot.meridianBotId,
        botLabel: selectedBot.label,
        title: siteTitle.trim() || selectedBot.name,
        linkedGuildId: selectedBot.linkedGuildId,
      });
      setCreatedSite({ siteId, slug: selectedBot.meridianBotId });
      setStep("success");
    } catch (cause) {
      setError(userFacingError(cause, "Could not create site."));
    } finally {
      setBusy(false);
    }
  }

  function handleContinueFromWelcome() {
    if (!linkingState) return;
    if (!linkingState.meridianConnected) {
      setStep("connect");
      return;
    }
    if (linkingState.bots.length === 0) {
      setStep("link");
      return;
    }
    if (linkingState.bots.length === 1) {
      setSelectedBotId(linkingState.bots[0].meridianBotId);
      setSiteTitle(linkingState.bots[0].name);
      setStep("confirm");
      return;
    }
    setStep("choose");
  }

  function handleChooseBot(bot: MeridianBotChoice) {
    setSelectedBotId(bot.meridianBotId);
    setSiteTitle(bot.name);
    setStep("confirm");
  }

  if (!open) return null;

  const previewSubdomain = selectedBot?.meridianBotId ?? "123456789012345";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close onboarding"
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!busy) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="relative z-10 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl"
      >
        <StepIndicator step={step} />

        {step === "welcome" ? (
          <div className="mt-4">
            <h2
              id="onboarding-title"
              className="text-sm font-medium text-zinc-100"
            >
              Create your bot dashboard
            </h2>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Dock gives your Meridian bot a staff panel at a dedicated
              subdomain. Link a bot, confirm your site details, and start
              editing pages.
            </p>
            <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
              Preview: {formatSiteHostPreview(previewSubdomain)}
            </p>
          </div>
        ) : null}

        {step === "connect" ? (
          <div className="mt-4">
            <h2
              id="onboarding-title"
              className="text-sm font-medium text-zinc-100"
            >
              Connect Meridian
            </h2>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Sign in with Meridian so Dock can list the bots you own or
              collaborate on.
            </p>
            <button
              type="button"
              disabled={pendingMeridian}
              onClick={() => void handleMeridianSignIn()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 text-sm text-zinc-100 transition-colors hover:border-zinc-500 disabled:cursor-wait disabled:opacity-60"
            >
              <MeridianLogoIcon className="h-4 w-4 shrink-0" />
              {pendingMeridian ? "Redirecting…" : "Continue with Meridian"}
            </button>
          </div>
        ) : null}

        {step === "link" ? (
          <div className="mt-4">
            <h2
              id="onboarding-title"
              className="text-sm font-medium text-zinc-100"
            >
              Link a Meridian bot
            </h2>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Create or link a bot on Meridian, then come back here and refresh.
              Dock needs a real Meridian bot to power your dashboard.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href="https://meridian.surf"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-zinc-700 px-5 py-2.5 text-center text-sm text-zinc-100 transition-colors hover:border-zinc-500"
              >
                Open Meridian
              </a>
              <button
                type="button"
                disabled={busy}
                onClick={() => void loadState(true)}
                className="rounded-full border border-zinc-800 px-5 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? "Refreshing…" : "Refresh bot list"}
              </button>
            </div>
          </div>
        ) : null}

        {step === "choose" ? (
          <div className="mt-4">
            <h2
              id="onboarding-title"
              className="text-sm font-medium text-zinc-100"
            >
              Choose a bot
            </h2>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Select which Meridian bot this dashboard should be linked to.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {linkingState?.bots.map((bot) => (
                <button
                  key={bot.meridianBotId}
                  type="button"
                  onClick={() => handleChooseBot(bot)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-left transition-colors hover:border-zinc-700"
                >
                  <p className="text-sm text-zinc-200">{bot.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatSiteHostPreview(bot.meridianBotId)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === "confirm" && selectedBot ? (
          <div className="mt-4">
            <h2
              id="onboarding-title"
              className="text-sm font-medium text-zinc-100"
            >
              Confirm your site
            </h2>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Your dashboard will be available at{" "}
              <span className="text-zinc-300">
                {formatSiteHostPreview(selectedBot.meridianBotId)}
              </span>
              .
            </p>
            <label className="mt-4 block text-xs text-zinc-500">
              Site title
              <input
                value={siteTitle}
                onChange={(event) => setSiteTitle(event.target.value)}
                className="mt-2 w-full rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-100"
              />
            </label>
            <p className="mt-3 text-xs text-zinc-600">
              Bot: {selectedBot.name}
            </p>
          </div>
        ) : null}

        {step === "success" && createdSite ? (
          <div className="mt-4">
            <h2
              id="onboarding-title"
              className="text-sm font-medium text-zinc-100"
            >
              Dashboard created
            </h2>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Your site is ready at{" "}
              {formatSiteHost({
                siteId: createdSite.siteId,
                slug: createdSite.slug,
              })}
              .
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={buildSiteEditUrl({
                  siteId: createdSite.siteId,
                  slug: createdSite.slug,
                })}
                className="rounded-full border border-zinc-700 px-5 py-2.5 text-center text-sm text-zinc-100 transition-colors hover:border-zinc-500"
              >
                Open editor
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-zinc-800 px-5 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-xs text-red-400">{error}</p> : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          {step !== "success" ? (
            <button
              type="button"
              disabled={busy || pendingMeridian}
              onClick={onClose}
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-60"
            >
              Cancel
            </button>
          ) : (
            <span />
          )}

          {step === "welcome" ? (
            <button
              type="button"
              disabled={busy || !linkingState}
              onClick={handleContinueFromWelcome}
              className="rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-100 transition-colors hover:border-zinc-500 disabled:cursor-wait disabled:opacity-60"
            >
              Continue
            </button>
          ) : null}

          {step === "connect" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep("welcome")}
              className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
            >
              Back
            </button>
          ) : null}

          {step === "link" || step === "choose" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setStep(
                  !linkingState?.meridianConnected ? "connect" : "welcome",
                )
              }
              className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
            >
              Back
            </button>
          ) : null}

          {step === "confirm" ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setStep(
                    (linkingState?.bots.length ?? 0) > 1 ? "choose" : "link",
                  )
                }
                className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy || !selectedBot}
                onClick={() => void handleCreateSite()}
                className="rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-100 transition-colors hover:border-zinc-500 disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create dashboard"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
