import type { Doc, Id } from "../_generated/dataModel";

export type SiteAccessSettings = {
  allowCollaborators: boolean;
  allowGuildAdministrators: boolean;
  allowManageServer: boolean;
};

export type SiteTheme = {
  background?: string;
  foreground?: string;
  surface?: string;
  accent?: string;
};

export type SiteProtectedPageSettings = {
  title?: string;
  message?: string;
  homeButtonLabel?: string;
  retryButtonLabel?: string;
  showHomeButton?: boolean;
  showRetryButton?: boolean;
};

export type PublishedBlock = {
  blockId: string;
  type: string;
  order: number;
  parentBlockId?: string;
  props: Record<string, unknown>;
};

export type PageAccessSettings = {
  mode: "public" | "authenticated" | "staff" | "roles" | "whitelist";
  allowedRoleIds?: string[];
  allowedUserIds?: string[];
};

export type PublishedPage = {
  id: string;
  slug: string;
  title: string;
  kind: "standard" | "case_detail" | "protected";
  sortOrder: number;
  showInNav: boolean;
  showBreadcrumbs: boolean;
  breadcrumbType: "minimal" | "bar";
  pageAccessSettings?: PageAccessSettings;
  blocks: PublishedBlock[];
};

export type PublishedCaseCollection = {
  blockId: string;
  meridianBotId: string;
  scope: "guild" | "global";
  guildKey: string;
  typeFilter: string;
  statusFilter: string;
  detailPageId?: string;
  caseUrlPattern: string;
};

export type NavbarStyle = "default" | "minimal" | "bar" | "hidden";
export type NavbarMenu = "links" | "hamburger" | "auto";
export type NavbarAlign = "start" | "center" | "between" | "end";
export type NavbarLinkStyle = "text" | "pills";
export type NavbarBrandSide = "start" | "end";

export function resolvePublishedNavbar(site: {
  title: string;
  navbarStyle?: string;
  navbarText?: string;
  navbarMenu?: string;
  navbarAlign?: string;
  navbarBrandSide?: string;
  navbarLinkStyle?: string;
  navbarShowBrand?: boolean;
}): {
  navbarStyle: NavbarStyle;
  navbarText: string;
  navbarMenu: NavbarMenu;
  navbarAlign: NavbarAlign;
  navbarBrandSide: NavbarBrandSide;
  navbarLinkStyle: NavbarLinkStyle;
  navbarShowBrand: boolean;
} {
  return {
    navbarStyle:
      site.navbarStyle === "default" ||
      site.navbarStyle === "minimal" ||
      site.navbarStyle === "bar" ||
      site.navbarStyle === "hidden"
        ? (site.navbarStyle as NavbarStyle)
        : ("default" as const),
    navbarText: site.navbarText?.trim() || site.title,
    navbarMenu:
      site.navbarMenu === "hamburger" || site.navbarMenu === "auto"
        ? (site.navbarMenu as "hamburger" | "auto")
        : ("links" as const),
    navbarAlign:
      site.navbarAlign === "start" ||
      site.navbarAlign === "center" ||
      site.navbarAlign === "end"
        ? (site.navbarAlign as "start" | "center" | "end")
        : ("between" as const),
    navbarBrandSide: site.navbarBrandSide === "end" ? ("end" as const) : ("start" as const),
    navbarLinkStyle:
      site.navbarLinkStyle === "pills" ? ("pills" as const) : ("text" as const),
    navbarShowBrand: site.navbarShowBrand !== false,
  };
}

export type PublishedSnapshot = {
  title: string;
  theme: SiteTheme;
  navbarStyle: NavbarStyle;
  navbarText: string;
  navbarMenu: NavbarMenu;
  navbarAlign: NavbarAlign;
  navbarBrandSide: NavbarBrandSide;
  navbarLinkStyle: NavbarLinkStyle;
  navbarShowBrand: boolean;
  caseUrlPattern: string;
  accessSettings: SiteAccessSettings;
  protectedPage?: SiteProtectedPageSettings;
  pages: PublishedPage[];
  caseCollections: PublishedCaseCollection[];
};

export type SiteDoc = Doc<"sites">;

export type SiteCaseRecord = Doc<"siteCaseRecords">;

export type SitePageDoc = Doc<"sitePages">;

export type SiteBlockDoc = Doc<"siteBlocks">;

export type SiteId = Id<"sites">;

export type SitePageId = Id<"sitePages">;
