import Link from "next/link";
import { DockBrand } from "@/components/dashboard/dock-brand";

const PRODUCT_LINKS = [
  { href: "/premium", label: "Pricing" },
  { href: "/login", label: "Log in" },
  { href: "/login", label: "Get started" },
] as const;

const COMPANY_LINKS = [
  { href: "/legal", label: "Legal" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
] as const;

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-white">{title}</p>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.08] px-6 pt-16 pb-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <DockBrand href="/" />
          <p className="mt-4 text-sm leading-6 text-zinc-500">
            Visual sites for Meridian Discord bots. Appeals, tickets, and rules
            on a page staff and users can actually use.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-16 sm:gap-20">
          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
        </nav>
      </div>
      <p className="mx-auto mt-14 max-w-6xl text-xs text-zinc-600">
        © 2026 Dock by Meridian
      </p>
    </footer>
  );
}
