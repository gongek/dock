import type { ReactNode } from "react";
import { PoweredByDock } from "@/components/sites/powered-by-dock";
import { SiteNavbar } from "@/components/sites/site-navbar";
import {
  resolveNavbarSettings,
  type NavbarAlign,
  type NavbarBrandSide,
  type NavbarLayoutPreview,
  type NavbarLinkStyle,
  type NavbarMenu,
  type NavbarPageLink,
  type NavbarStyle,
} from "@/lib/sites/navbar";

export function SiteShell({
  title,
  children,
  theme,
  editHref,
  interactive = true,
  navbarStyle,
  navbarText,
  navbarMenu,
  navbarAlign,
  navbarBrandSide,
  navbarLinkStyle,
  navbarShowBrand,
  pages = [],
  currentSlug,
  onNavbarClick,
  navbarLayoutPreview,
  showDockBranding = true,
  publicBasePath = "",
  brandNode,
}: {
  title: string;
  children: ReactNode;
  theme?: {
    background?: string;
    foreground?: string;
    surface?: string;
    accent?: string;
  };
  editHref?: string;
  interactive?: boolean;
  navbarStyle?: NavbarStyle;
  navbarText?: string;
  navbarMenu?: NavbarMenu;
  navbarAlign?: NavbarAlign;
  navbarBrandSide?: NavbarBrandSide;
  navbarLinkStyle?: NavbarLinkStyle;
  navbarShowBrand?: boolean;
  pages?: NavbarPageLink[];
  currentSlug?: string;
  onNavbarClick?: () => void;
  navbarLayoutPreview?: NavbarLayoutPreview | null;
  showDockBranding?: boolean;
  publicBasePath?: string;
  brandNode?: ReactNode;
}) {
  const style = {
    ["--site-background" as string]: theme?.background ?? "#090909",
    ["--site-foreground" as string]: theme?.foreground ?? "#ededed",
    ["--site-surface" as string]: theme?.surface ?? "#18181b",
    ["--site-accent" as string]: theme?.accent ?? "#a1a1aa",
  };

  const navbar = resolveNavbarSettings(
    {
      navbarStyle,
      navbarText,
      navbarMenu,
      navbarAlign,
      navbarBrandSide,
      navbarLinkStyle,
      navbarShowBrand,
    },
    title,
  );

  const editLink =
    editHref ? (
      <a
        href={editHref}
        className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
      >
        Edit site
      </a>
    ) : null;

  return (
    <div className="site-shell flex min-h-full flex-1 flex-col" style={style}>
      {navbar.style === "hidden" ? (
        editLink ? (
          <div className="flex justify-end px-6 py-3">{editLink}</div>
        ) : null
      ) : (
        <SiteNavbar
          brand={brandNode ?? navbar.text}
          navbarStyle={navbar.style}
          menu={navbar.menu}
          align={navbar.align}
          brandSide={navbar.brandSide}
          linkStyle={navbar.linkStyle}
          showBrand={navbar.showBrand}
          pages={pages}
          currentSlug={currentSlug}
          interactive={interactive}
          editLink={editLink}
          basePath={publicBasePath}
          onNavbarClick={onNavbarClick}
          layoutPreview={navbarLayoutPreview}
        />
      )}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">{children}</main>
      {showDockBranding ? <PoweredByDock interactive={interactive} /> : null}
    </div>
  );
}
