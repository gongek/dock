export const BREADCRUMB_TYPES = ["minimal", "bar"] as const;

export type BreadcrumbType = (typeof BREADCRUMB_TYPES)[number];

export const BREADCRUMB_TYPE_OPTIONS: { label: string; value: BreadcrumbType }[] = [
  { label: "Minimal", value: "minimal" },
  { label: "Bar", value: "bar" },
];

export function isBreadcrumbType(value: unknown): value is BreadcrumbType {
  return value === "minimal" || value === "bar";
}

export function resolveShowBreadcrumbs(
  showBreadcrumbs: boolean | undefined,
  hasBreadcrumbBlocks: boolean,
): boolean {
  if (showBreadcrumbs !== undefined) return showBreadcrumbs;
  return hasBreadcrumbBlocks;
}

export function resolveBreadcrumbType(
  breadcrumbType: unknown,
  crumbBlockProps?: Record<string, unknown>,
): BreadcrumbType {
  if (isBreadcrumbType(breadcrumbType)) return breadcrumbType;
  if (isBreadcrumbType(crumbBlockProps?.theme)) return crumbBlockProps.theme;
  if (isBreadcrumbType(crumbBlockProps?.type)) return crumbBlockProps.type;
  return "minimal";
}

export function isBreadcrumbBlockType(type: string): boolean {
  return type === "breadcrumbs";
}

export function parseBlockProps(propsJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(propsJson) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }
  return {};
}
