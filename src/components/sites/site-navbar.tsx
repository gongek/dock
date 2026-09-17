"use client";



import { useEffect, useId, useState, type MouseEvent, type ReactNode } from "react";

import {

  navbarLayoutPreviewActive,

  pageHref,

  visibleNavbarPages,

  type NavbarAlign,

  type NavbarBrandSide,

  type NavbarLayoutPreview,

  type NavbarLinkStyle,

  type NavbarMenu,

  type NavbarPageLink,

  type NavbarStyle,

} from "@/lib/sites/navbar";



function alignClass(align: NavbarAlign): string {

  switch (align) {

    case "start":

      return "justify-start";

    case "center":

      return "justify-center";

    case "end":

      return "justify-end";

    default:

      return "justify-between";

  }

}



function linkClass(style: NavbarLinkStyle, active: boolean): string {

  if (style === "pills") {

    return active

      ? "rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-sm text-zinc-100"

      : "rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100";

  }

  return active

    ? "text-sm text-zinc-100"

    : "text-sm text-zinc-400 transition-colors hover:text-zinc-200";

}



function ghostShell(className: string, children: ReactNode) {

  return (

    <div

      className={`rounded-md border border-dashed border-zinc-600/60 bg-zinc-800/30 text-zinc-400 ${className}`}

    >

      {children}

    </div>

  );

}



function NavLink({

  page,

  currentSlug,

  linkStyle,

  interactive,

  stacked = false,

  basePath,

  onClick,

  ghost = false,

}: {

  page: NavbarPageLink;

  currentSlug?: string;

  linkStyle: NavbarLinkStyle;

  interactive: boolean;

  stacked?: boolean;

  basePath: string;

  onClick?: () => void;

  ghost?: boolean;

}) {

  const active = currentSlug === page.slug;

  const className = `${linkClass(linkStyle, active)}${stacked ? " block px-1 py-1.5" : ""}`;

  if (ghost) {

    return ghostShell("px-2.5 py-0.5", <span className="text-sm">{page.title}</span>);

  }

  if (!interactive) {

    return (

      <span className={className} aria-current={active ? "page" : undefined}>

        {page.title}

      </span>

    );

  }

  return (

    <a

      href={pageHref(page.slug, basePath)}

      className={className}

      aria-current={active ? "page" : undefined}

      onClick={onClick}

    >

      {page.title}

    </a>

  );

}



function NavbarLayoutRow({

  align,

  brandSide,

  brandNode,

  actions,

}: {

  align: NavbarAlign;

  brandSide: NavbarBrandSide;

  brandNode: ReactNode;

  actions: ReactNode;

}) {

  if (align === "between") {

    return (

      <div className="flex w-full items-center justify-between gap-4">

        {brandSide === "end" ? (

          <>

            {actions}

            {brandNode ?? <span />}

          </>

        ) : (

          <>

            {brandNode ?? <span />}

            {actions}

          </>

        )}

      </div>

    );

  }



  return (

    <div className={`flex w-full items-center gap-4 ${alignClass(align)}`}>

      {brandNode}

      {actions}

    </div>

  );

}



export function SiteNavbar({

  brand,

  navbarStyle,

  menu,

  align,

  brandSide = "start",

  linkStyle,

  showBrand,

  pages,

  currentSlug,

  interactive,

  editLink,

  basePath = "",

  onNavbarClick,

  layoutPreview = null,

}: {

  brand: ReactNode;

  navbarStyle: NavbarStyle;

  menu: NavbarMenu;

  align: NavbarAlign;

  brandSide?: NavbarBrandSide;

  linkStyle: NavbarLinkStyle;

  showBrand: boolean;

  pages: NavbarPageLink[];

  currentSlug?: string;

  interactive: boolean;

  editLink?: ReactNode;

  basePath?: string;

  onNavbarClick?: () => void;

  layoutPreview?: NavbarLayoutPreview | null;

}) {

  const [open, setOpen] = useState(false);

  const menuId = useId();

  const links = navbarStyle === "minimal" ? [] : visibleNavbarPages(pages);

  const showInline = menu === "links" || menu === "auto";

  const showHamburger = menu === "hamburger" || menu === "auto";

  const previewActive = navbarLayoutPreviewActive(

    { align, brandSide },

    layoutPreview,

  );

  const previewAlign = layoutPreview?.align ?? align;

  const previewBrandSide = layoutPreview?.brandSide ?? brandSide;



  useEffect(() => {

    setOpen(false);

  }, [currentSlug, menu]);



  const titleClassName = "text-sm font-medium tracking-wide text-zinc-200";



  function renderBrandNode(ghost = false) {

    if (!showBrand) return null;

    if (ghost) {

      return ghostShell("px-2.5 py-0.5", <span className="text-sm font-medium">{brand}</span>);

    }

    if (interactive) {

      return (

        <a href={pageHref("home", basePath)} className={titleClassName}>

          {brand}

        </a>

      );

    }

    return <span className={titleClassName}>{brand}</span>;

  }



  function renderActions(ghost = false) {

    const inlineLinks =

      links.length > 0 ? (

        <nav

          className={`flex flex-wrap items-center gap-3 ${

            menu === "auto" ? "hidden md:flex" : ""

          }`}

          aria-label={ghost ? undefined : "Site"}

        >

          {links.map((page) => (

            <NavLink

              key={page.slug}

              page={page}

              currentSlug={currentSlug}

              linkStyle={linkStyle}

              interactive={interactive}

              basePath={basePath}

              ghost={ghost}

            />

          ))}

        </nav>

      ) : null;



    const hamburgerButton =

      links.length > 0 && showHamburger ? (

        ghost ? (

          ghostShell("flex size-8 items-center justify-center", <span className="text-xs">≡</span>)

        ) : (

          <button

            type="button"

            className={`flex size-8 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-zinc-100 ${

              menu === "auto" ? "md:hidden" : ""

            }`}

            aria-label={open ? "Close menu" : "Open menu"}

            aria-expanded={open}

            aria-controls={menuId}

            onClick={(event) => {

              event.stopPropagation();

              setOpen((value) => !value);

            }}

          >

            <i className={`bx ${open ? "bx-x" : "bx-menu"} text-xl`} aria-hidden />

          </button>

        )

      ) : null;



    return (

      <div className="flex shrink-0 items-center gap-3">

        {showInline ? inlineLinks : null}

        {hamburgerButton}

        {ghost ? null : editLink}

      </div>

    );

  }



  const inner = (

    <NavbarLayoutRow

      align={align}

      brandSide={brandSide}

      brandNode={renderBrandNode()}

      actions={renderActions()}

    />

  );



  const previewInner = (

    <NavbarLayoutRow

      align={previewAlign}

      brandSide={previewBrandSide}

      brandNode={renderBrandNode(true)}

      actions={renderActions(true)}

    />

  );



  const headerProps = {

    onClick: onNavbarClick

      ? (event: MouseEvent<HTMLElement>) => {

          event.stopPropagation();

          onNavbarClick();

        }

      : undefined,

  };



  function renderBarContent(content: ReactNode) {

    if (navbarStyle === "bar") {

      return (

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2">{content}</div>

      );

    }

    return content;

  }



  function renderPreviewBarContent(content: ReactNode) {

    if (navbarStyle === "bar") {

      return (

        <div className="rounded-2xl border border-dashed border-zinc-700/50 bg-zinc-900/40 px-4 py-2">

          {content}

        </div>

      );

    }

    return content;

  }



  if (navbarStyle === "minimal") {

    return (

      <header className="relative px-6 py-4" {...headerProps}>

        <div className="flex w-full items-center justify-center">

          {renderBrandNode()}

        </div>

        {editLink ? (

          <div className="absolute right-6 top-1/2 -translate-y-1/2">{editLink}</div>

        ) : null}

      </header>

    );

  }



  return (

    <header className="relative border-b border-zinc-800 px-6 py-4" {...headerProps}>

      <div

        className={`mx-auto w-full max-w-4xl transition-opacity duration-150 ${

          previewActive ? "opacity-25" : ""

        }`}

      >

        {renderBarContent(inner)}

        {open && showHamburger && links.length > 0 ? (

          <nav

            id={menuId}

            className={`mt-3 flex flex-col gap-1 ${

              menu === "auto" ? "md:hidden" : ""

            }`}

            aria-label="Site menu"

          >

            {links.map((page) => (

              <NavLink

                key={page.slug}

                page={page}

                currentSlug={currentSlug}

                linkStyle={linkStyle}

                interactive={interactive}

                basePath={basePath}

                stacked

                onClick={() => setOpen(false)}

              />

            ))}

          </nav>

        ) : null}

      </div>

      {previewActive ? (

        <div

          className="pointer-events-none absolute inset-0 px-6 py-4"

          aria-hidden

        >

          <div className="mx-auto flex h-full w-full max-w-4xl items-center">

            {renderPreviewBarContent(previewInner)}

          </div>

        </div>

      ) : null}

    </header>

  );

}


