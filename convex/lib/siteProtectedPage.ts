import { v } from "convex/values";

export const siteProtectedPageValidator = v.object({
  title: v.optional(v.string()),
  message: v.optional(v.string()),
  homeButtonLabel: v.optional(v.string()),
  retryButtonLabel: v.optional(v.string()),
  showHomeButton: v.optional(v.boolean()),
  showRetryButton: v.optional(v.boolean()),
});

export type SiteProtectedPageSettings = {
  title?: string;
  message?: string;
  homeButtonLabel?: string;
  retryButtonLabel?: string;
  showHomeButton?: boolean;
  showRetryButton?: boolean;
};

export type ResolvedSiteProtectedPage = {
  title: string;
  message: string;
  homeButtonLabel: string;
  retryButtonLabel: string;
  showHomeButton: boolean;
  showRetryButton: boolean;
};

export const DEFAULT_SITE_PROTECTED_PAGE: ResolvedSiteProtectedPage = {
  title: "This site is protected",
  message: "You don't have access to view this page.",
  homeButtonLabel: "Back to home",
  retryButtonLabel: "Try again",
  showHomeButton: true,
  showRetryButton: true,
};

export function resolveSiteProtectedPage(
  raw: SiteProtectedPageSettings | undefined | null,
): ResolvedSiteProtectedPage {
  return {
    title: raw?.title?.trim() || DEFAULT_SITE_PROTECTED_PAGE.title,
    message: raw?.message?.trim() || DEFAULT_SITE_PROTECTED_PAGE.message,
    homeButtonLabel:
      raw?.homeButtonLabel?.trim() || DEFAULT_SITE_PROTECTED_PAGE.homeButtonLabel,
    retryButtonLabel:
      raw?.retryButtonLabel?.trim() || DEFAULT_SITE_PROTECTED_PAGE.retryButtonLabel,
    showHomeButton: raw?.showHomeButton !== false,
    showRetryButton: raw?.showRetryButton !== false,
  };
}

export function normalizeSiteProtectedPageInput(
  raw: SiteProtectedPageSettings,
): SiteProtectedPageSettings {
  return {
    ...(raw.title !== undefined ? { title: raw.title.trim() || undefined } : {}),
    ...(raw.message !== undefined ? { message: raw.message.trim() || undefined } : {}),
    ...(raw.homeButtonLabel !== undefined
      ? { homeButtonLabel: raw.homeButtonLabel.trim() || undefined }
      : {}),
    ...(raw.retryButtonLabel !== undefined
      ? { retryButtonLabel: raw.retryButtonLabel.trim() || undefined }
      : {}),
    ...(raw.showHomeButton !== undefined ? { showHomeButton: raw.showHomeButton } : {}),
    ...(raw.showRetryButton !== undefined ? { showRetryButton: raw.showRetryButton } : {}),
  };
}
