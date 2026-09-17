export const siteEditorAccessErrorDetails = {
  not_authenticated: {
    title: "Sign in required",
    message: "Please sign in to edit this site.",
  },
  forbidden: {
    title: "Access denied",
    message: "You do not have access to edit this site.",
  },
} as const;

export type SiteEditorAccessErrorCode = keyof typeof siteEditorAccessErrorDetails;
