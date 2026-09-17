import { httpAction } from "./_generated/server";
import { normalizeSiteSlug } from "./lib/siteValidators";
import {
  buildOnboardingPublicUrl,
  resolveOnboardingSiteUrlFromRequest,
} from "./lib/onboardingUrls";

export const onboardingSelectCallback = httpAction(async (_ctx, request) => {
  const url = new URL(request.url);
  const meridianError = url.searchParams.get("error")?.trim();
  const botRaw = url.searchParams.get("bot")?.trim();
  const siteUrl = resolveOnboardingSiteUrlFromRequest(request);

  const linkUrl = () => buildOnboardingPublicUrl("/sites/link", siteUrl);

  if (meridianError) {
    const destination = new URL(linkUrl());
    destination.searchParams.set("error", meridianError);
    return Response.redirect(destination.toString(), 302);
  }

  const bot = botRaw ? normalizeSiteSlug(botRaw) : null;
  if (!bot) {
    const destination = new URL(linkUrl());
    destination.searchParams.set("error", "missing_bot");
    return Response.redirect(destination.toString(), 302);
  }

  const destination = new URL(buildOnboardingPublicUrl("/sites/config", siteUrl));
  destination.searchParams.set("bot", bot);
  return Response.redirect(destination.toString(), 302);
});
