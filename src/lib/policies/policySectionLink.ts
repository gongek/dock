export function policySectionDomId(sectionNumber: number): string {
  return `section-${sectionNumber}`;
}

export function policySectionHref(policyPath: string, section: number | string): string {
  const base = policyPath.split(/[?#]/)[0]!;

  if (typeof section === "number") {
    return `${base}?section=${section}`;
  }

  return `${base}#${section}`;
}
