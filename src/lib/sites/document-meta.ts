export function resolveSiteDocumentTitle(
  pageTitle: string | undefined,
  siteTitle: string | undefined,
): string {
  const page = pageTitle?.trim() ?? "";
  const site = siteTitle?.trim() ?? "";
  if (!page) return site || "Site";
  if (!site || page === site) return page;
  return `${page} · ${site}`;
}
