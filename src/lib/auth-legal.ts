/**
 * Inline Terms/Privacy copy on OAuth buttons is mainly for first-time account
 * creation (contract acceptance + notice at collection). Returning users are
 * already bound; site-wide /legal links remain available regardless.
 */
export function shouldShowAuthLegalFooter(input: {
  authLoading: boolean;
  isAuthenticated: boolean;
}): boolean {
  if (input.authLoading) {
    return false;
  }
  return !input.isAuthenticated;
}
