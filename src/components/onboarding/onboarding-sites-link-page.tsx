"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useAction } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AuthLegalFooter } from "@/components/auth-legal-footer";
import {
  SocialLoginButtons,
  SocialLoginError,
} from "@/components/social-login-buttons";
import { shouldShowAuthLegalFooter } from "@/lib/auth-legal";
import { OnboardingSitesShell } from "@/components/onboarding/onboarding-sites-shell";
import { buildOnboardingPath } from "@/lib/onboarding-host";
import {
  buildOnboardingMeridianHandoffUrl,
  buildOnboardingSitesLinkUrl,
  isMeridianBotSelectHandoff,
  meridianOnboardingReadyForBotSelect,
  onboardingErrorMessage,
  readMeridianBotHandoffId,
  readOnboardingErrorCode,
} from "@/lib/meridian-bot-select";
import { userFacingError } from "@/lib/user-facing-error";

export function OnboardingSitesLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const getBotLinkingState = useAction(api.meridian.onboarding.getBotLinkingState);
  const buildMeridianBotSelectHandoffUrl = useAction(
    api.meridian.botSelectHandoff.buildMeridianBotSelectHandoffUrl,
  );

  const handoffBotId = readMeridianBotHandoffId(searchParams);
  const meridianHandoff = isMeridianBotSelectHandoff(searchParams);
  const callbackError = onboardingErrorMessage(readOnboardingErrorCode(searchParams));

  const [busy, setBusy] = useState(() => Boolean(handoffBotId));
  const [error, setError] = useState<string | null>(callbackError);
  const [pendingProvider, setPendingProvider] = useState<
    "meridian" | "discord" | null
  >(null);
  const handoffStartedRef = useRef(false);

  const redirectToMeridianBotSelect = useCallback(async () => {
    try {
      const url = await buildMeridianBotSelectHandoffUrl({});
      window.location.assign(url);
    } catch (cause) {
      setError(userFacingError(cause, "Could not open Meridian bot selection."));
      handoffStartedRef.current = false;
      setBusy(false);
    }
  }, [buildMeridianBotSelectHandoffUrl]);

  const runMeridianHandoff = useCallback(async () => {
    if (handoffStartedRef.current) {
      return;
    }
    handoffStartedRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const state = await getBotLinkingState({});
      if (meridianOnboardingReadyForBotSelect(state)) {
        await redirectToMeridianBotSelect();
        return;
      }
      setError(
        "Meridian is not connected yet. Use Continue with Meridian to try again.",
      );
      handoffStartedRef.current = false;
    } catch (cause) {
      setError(userFacingError(cause, "Could not continue Meridian setup."));
      handoffStartedRef.current = false;
    } finally {
      setBusy(false);
    }
  }, [getBotLinkingState, redirectToMeridianBotSelect]);

  const loadBotHandoff = useCallback(async () => {
    setBusy(true);
    setError(callbackError);
    try {
      const state = await getBotLinkingState({});

      if (handoffBotId && state.bots.some((b) => b.meridianBotId === handoffBotId)) {
        router.replace(
          `${buildOnboardingPath("/sites/config")}?bot=${encodeURIComponent(handoffBotId)}`,
        );
        return;
      }

      if (handoffBotId) {
        setError(
          "That bot is not available on your Meridian account. Choose another bot on Meridian.",
        );
      }
    } catch (cause) {
      setError(userFacingError(cause, "Could not load Meridian bot information."));
    } finally {
      setBusy(false);
    }
  }, [callbackError, getBotLinkingState, handoffBotId, router]);

  useEffect(() => {
    if (handoffBotId) {
      void loadBotHandoff();
      return;
    }

    if (meridianHandoff) {
      if (authLoading) {
        return;
      }
      if (!isAuthenticated) {
        setBusy(false);
        setError("Sign-in did not complete. Use Continue with Meridian to try again.");
        return;
      }
      void runMeridianHandoff();
      return;
    }

    setBusy(false);
    setError(callbackError);
  }, [
    authLoading,
    callbackError,
    handoffBotId,
    isAuthenticated,
    loadBotHandoff,
    meridianHandoff,
    runMeridianHandoff,
  ]);

  async function handleContinueWithMeridian() {
    setError(null);
    setPendingProvider("meridian");
    try {
      if (isAuthenticated) {
        const state = await getBotLinkingState({});
        if (meridianOnboardingReadyForBotSelect(state)) {
          await redirectToMeridianBotSelect();
          return;
        }
      }
      await signIn("meridian", {
        redirectTo: buildOnboardingMeridianHandoffUrl(),
      });
    } catch (cause) {
      setError(userFacingError(cause, "Could not start Meridian sign-in."));
      setPendingProvider(null);
    }
  }

  async function handleDiscordLogin() {
    setError(null);
    setPendingProvider("discord");
    try {
      await signIn("discord", {
        redirectTo: buildOnboardingSitesLinkUrl(),
      });
    } catch (cause) {
      setError(userFacingError(cause, "Could not start Discord login."));
      setPendingProvider(null);
    }
  }

  const showHandoffUi = meridianHandoff && !error;
  const shellTitle = showHandoffUi ? "Connecting Meridian" : "Connect Meridian";

  const shellSubtitle =
    showHandoffUi ? undefined : "Sign in with Meridian and choose your bot.";
  const showLegalFooter = shouldShowAuthLegalFooter({
    authLoading,
    isAuthenticated,
  });

  return (
    <OnboardingSitesShell
      activeStep="link"
      title={shellTitle}
      subtitle={shellSubtitle}
    >
        {showHandoffUi || (handoffBotId && busy) ? (
          <p className="text-sm text-zinc-400">Continuing…</p>
        ) : (
          <>
            <SocialLoginButtons
              pendingProvider={pendingProvider}
              onMeridian={() => void handleContinueWithMeridian()}
              onDiscord={() => void handleDiscordLogin()}
              footer={error ? <SocialLoginError message={error} /> : null}
            />
            {showLegalFooter ? <AuthLegalFooter /> : null}
          </>
        )}
    </OnboardingSitesShell>
  );
}
