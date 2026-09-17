export const DEFAULT_CASE_URL_PATTERN = "/{case_slug}";

const TOKEN_RE = /\{(case_slug|case_number)\}/g;

export function validateCaseUrlPattern(pattern: string): boolean {
  const trimmed = pattern.trim();
  if (!trimmed.startsWith("/")) return false;
  if (!TOKEN_RE.test(trimmed)) return false;
  return true;
}

export function resolveCaseUrl(
  pattern: string,
  input: { publicSlug: string; caseNumber: number },
): string {
  return pattern
    .replace(/\{case_slug\}/g, input.publicSlug)
    .replace(/\{case_number\}/g, String(input.caseNumber));
}

export function patternToRegex(pattern: string): RegExp | null {
  const trimmed = pattern.trim();
  if (!trimmed.startsWith("/")) return null;
  const escaped = trimmed
    .replace(/\{case_slug\}/g, "([A-Za-z0-9_-]+)")
    .replace(/\{case_number\}/g, "(\\d+)");
  return new RegExp(`^${escaped}$`);
}

export function parseCaseFromPath(
  pattern: string,
  pathname: string,
): { publicSlug?: string; caseNumber?: number } | null {
  const regex = patternToRegex(pattern);
  if (!regex) return null;
  const match = pathname.match(regex);
  if (!match) return null;

  if (pattern.includes("{case_slug}")) {
    const publicSlug = match[1];
    return publicSlug ? { publicSlug } : null;
  }

  if (pattern.includes("{case_number}")) {
    const caseNumber = Number(match[1]);
    return Number.isFinite(caseNumber) ? { caseNumber } : null;
  }

  return null;
}
