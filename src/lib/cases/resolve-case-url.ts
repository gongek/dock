import { parseCaseFromPath, resolveCaseUrl } from "./url-pattern";

export { DEFAULT_CASE_URL_PATTERN, parseCaseFromPath, resolveCaseUrl, validateCaseUrlPattern } from "./url-pattern";

export function resolveCaseHref(
  pattern: string,
  input: { publicSlug: string; caseNumber: number },
): string {
  return resolveCaseUrl(pattern, input);
}

export function matchCasePath(pattern: string, pathname: string) {
  return parseCaseFromPath(pattern, pathname);
}
