export const NAVBAR_STYLES = ["default", "minimal", "bar", "hidden"] as const;

export type NavbarStyle = (typeof NAVBAR_STYLES)[number];

export const NAVBAR_STYLE_OPTIONS: {
  label: string;
  value: NavbarStyle;
  description?: string;
}[] = [
  { label: "Default", value: "default", description: "Full header with brand and links" },
  { label: "Minimal", value: "minimal", description: "Brand only, no page links" },
  { label: "Bar", value: "bar", description: "Compact bar with links" },
  { label: "Hidden", value: "hidden", description: "No header shown" },
];

export const NAVBAR_MENUS = ["links", "hamburger", "auto"] as const;

export type NavbarMenu = (typeof NAVBAR_MENUS)[number];

export const NAVBAR_MENU_OPTIONS: { label: string; value: NavbarMenu; description?: string }[] = [
  { label: "Links", value: "links", description: "Always show page links" },
  { label: "Hamburger", value: "hamburger", description: "Collapse pages into a menu" },
  { label: "Auto", value: "auto", description: "Links on desktop, hamburger on mobile" },
];

export const NAVBAR_ALIGNS = ["start", "center", "between", "end"] as const;

export type NavbarAlign = (typeof NAVBAR_ALIGNS)[number];

export const NAVBAR_LINK_STYLES = ["text", "pills"] as const;

export type NavbarLinkStyle = (typeof NAVBAR_LINK_STYLES)[number];

export const NAVBAR_LINK_STYLE_OPTIONS: {
  label: string;
  value: NavbarLinkStyle;
  description?: string;
}[] = [
  { label: "Text", value: "text", description: "Plain text links" },
  { label: "Pills", value: "pills", description: "Rounded button-style links" },
];

export const NAVBAR_BRAND_SIDES = ["start", "end"] as const;

export type NavbarBrandSide = (typeof NAVBAR_BRAND_SIDES)[number];

export const NAVBAR_ARRANGE_WITH_BRAND_OPTIONS = [
  {
    label: "Together",
    value: "together",
    description: "Brand and links on one side",
  },
  {
    label: "Opposite sides",
    value: "opposite",
    description: "Brand and links on opposite sides",
  },
] as const;

export type NavbarArrangeWithBrand = (typeof NAVBAR_ARRANGE_WITH_BRAND_OPTIONS)[number]["value"];

export const NAVBAR_ARRANGE_OPTIONS = [
  { label: "Left", value: "start" as NavbarAlign },
  { label: "Center", value: "center" as NavbarAlign },
  { label: "Right", value: "end" as NavbarAlign },
];

export function navbarArrangeWithBrandValue(align: NavbarAlign): NavbarArrangeWithBrand {
  return isNavbarSplit(align) ? "opposite" : "together";
}

export type NavbarSettings = {
  style: NavbarStyle;
  text: string;
  menu: NavbarMenu;
  align: NavbarAlign;
  brandSide: NavbarBrandSide;
  linkStyle: NavbarLinkStyle;
  showBrand: boolean;
};

export function isNavbarSplit(align: NavbarAlign): boolean {
  return align === "between";
}

export type NavbarLayoutPreview = {
  align: NavbarAlign;
  brandSide?: NavbarBrandSide;
};

export function navbarLayoutPreviewActive(
  current: Pick<NavbarSettings, "align" | "brandSide">,
  preview: NavbarLayoutPreview | null,
): boolean {
  if (!preview) return false;
  if (preview.align !== current.align) return true;
  if (isNavbarSplit(preview.align) && isNavbarSplit(current.align)) {
    const previewSide = preview.brandSide ?? current.brandSide;
    return previewSide !== current.brandSide;
  }
  return false;
}

export type NavbarPageLink = {
  slug: string;
  title: string;
  showInNav?: boolean;
  kind?: string;
};

export function isNavbarStyle(value: unknown): value is NavbarStyle {
  return (
    value === "default" ||
    value === "minimal" ||
    value === "bar" ||
    value === "hidden"
  );
}

export function isNavbarMenu(value: unknown): value is NavbarMenu {
  return value === "links" || value === "hamburger" || value === "auto";
}

export function isNavbarAlign(value: unknown): value is NavbarAlign {
  return (
    value === "start" ||
    value === "center" ||
    value === "between" ||
    value === "end"
  );
}

export function isNavbarLinkStyle(value: unknown): value is NavbarLinkStyle {
  return value === "text" || value === "pills";
}

export function resolveNavbarStyle(value: unknown): NavbarStyle {
  return isNavbarStyle(value) ? value : "default";
}

export function resolveNavbarText(navbarText: unknown, siteTitle: string): string {
  const trimmed = String(navbarText ?? "").trim();
  return trimmed || siteTitle;
}

export function resolveNavbarMenu(value: unknown): NavbarMenu {
  return isNavbarMenu(value) ? value : "links";
}

export function resolveNavbarAlign(value: unknown): NavbarAlign {
  return isNavbarAlign(value) ? value : "between";
}

export function resolveNavbarLinkStyle(value: unknown): NavbarLinkStyle {
  return isNavbarLinkStyle(value) ? value : "text";
}

export function resolveNavbarShowBrand(value: unknown): boolean {
  return value !== false;
}

export function isNavbarBrandSide(value: unknown): value is NavbarBrandSide {
  return value === "start" || value === "end";
}

export function resolveNavbarBrandSide(value: unknown): NavbarBrandSide {
  return isNavbarBrandSide(value) ? value : "start";
}

export function resolveNavbarSettings(
  input: {
    navbarStyle?: unknown;
    navbarText?: unknown;
    navbarMenu?: unknown;
    navbarAlign?: unknown;
    navbarBrandSide?: unknown;
    navbarLinkStyle?: unknown;
    navbarShowBrand?: unknown;
  },
  siteTitle: string,
): NavbarSettings {
  return {
    style: resolveNavbarStyle(input.navbarStyle),
    text: resolveNavbarText(input.navbarText, siteTitle),
    menu: resolveNavbarMenu(input.navbarMenu),
    align: resolveNavbarAlign(input.navbarAlign),
    brandSide: resolveNavbarBrandSide(input.navbarBrandSide),
    linkStyle: resolveNavbarLinkStyle(input.navbarLinkStyle),
    showBrand: resolveNavbarShowBrand(input.navbarShowBrand),
  };
}

export function pageHref(slug: string, basePath = ""): string {
  const base = basePath.replace(/\/$/, "");
  if (slug === "home") return base || "/";
  return `${base}/${slug}`;
}

export function pageAppearsInNavbar(page: NavbarPageLink): boolean {
  if (page.kind === "case_detail" || page.kind === "protected") return false;
  return page.showInNav !== false;
}

export function visibleNavbarPages(pages: NavbarPageLink[]): NavbarPageLink[] {
  return pages.filter(pageAppearsInNavbar);
}
