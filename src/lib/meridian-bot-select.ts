import {
  buildOnboardingUrl,
} from "@/lib/onboarding-host";

export const ONBOARDING_SITES_LINK_PATH = "/sites/link";

export const MERIDIAN_BOT_SELECT_HANDOFF = "meridian-bot-select";

export function buildOnboardingSitesLinkUrl(): string {
  return buildOnboardingUrl(ONBOARDING_SITES_LINK_PATH);
}

/** @deprecated Use buildOnboardingSelectCallbackUrl for Meridian /select */
export function buildCreateBotSiteHandoffReturnPath(): string {
  return ONBOARDING_SITES_LINK_PATH;
}

/** OAuth return after Meridian sign-in during onboarding (auto-continues to bot select). */
export function buildOnboardingMeridianHandoffUrl(): string {
  const url = new URL(buildOnboardingSitesLinkUrl());
  url.searchParams.set("handoff", MERIDIAN_BOT_SELECT_HANDOFF);
  return url.toString();
}

/** @deprecated Use buildOnboardingMeridianHandoffUrl */
export function buildOnboardingMeridianAuthReturnUrl(): string {
  return buildOnboardingMeridianHandoffUrl();
}

export function isMeridianBotSelectHandoff(
  searchParams: Pick<URLSearchParams, "get">,
): boolean {
  return searchParams.get("handoff")?.trim() === MERIDIAN_BOT_SELECT_HANDOFF;
}

/**
 * @deprecated Signed handoff URLs are issued by `api.meridian.botSelectHandoff.buildMeridianBotSelectHandoffUrl`.
 */
export function buildMeridianBotSelectUrl(): never {
  throw new Error(
    "Use api.meridian.botSelectHandoff.buildMeridianBotSelectHandoffUrl for Meridian /select handoffs.",
  );
}

export function readMeridianBotHandoffId(
  searchParams: Pick<URLSearchParams, "get">,
): string | null {
  const bot = searchParams.get("bot")?.trim();
  return bot || null;
}

export function readOnboardingErrorCode(
  searchParams: Pick<URLSearchParams, "get">,
): string | null {
  const error = searchParams.get("error")?.trim();
  return error || null;
}

export function onboardingErrorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === "missing_bot") {
    return "No bot was selected. Choose a bot on Meridian to continue.";
  }
  return "Something went wrong while choosing a bot. Try again.";
}

export function meridianOnboardingReadyForBotSelect(state: {
  meridianConnected: boolean;
  error?: string;
}): boolean {
  if (!state.meridianConnected) {
    return false;
  }
  const message = state.error?.toLowerCase() ?? "";
  if (message.includes("access token")) {
    return false;
  }
  if (message.includes("connect your meridian account")) {
    return false;
  }
  return true;
}
