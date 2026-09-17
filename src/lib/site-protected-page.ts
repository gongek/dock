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
