export const LEGAL_BASE = "/legal";

export function legalPath(...segments: string[]): string {
  if (segments.length === 0) return LEGAL_BASE;
  return `${LEGAL_BASE}/${segments.map((s) => s.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/")}`;
}
