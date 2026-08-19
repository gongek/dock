import Link from "next/link";

type SiteFooterProps = {
  leading?: {
    label: string;
    href: string;
  };
};

export function SiteFooter({ leading }: SiteFooterProps = {}) {
  return (
    <p className="pb-6 text-center text-xs text-zinc-500">
      {leading ? (
        <Link href={leading.href} className="transition-colors hover:text-zinc-300">
          {leading.label}
        </Link>
      ) : (
        "Coming soon"
      )}
      <span className="mx-1.5">•</span>
      <Link href="/login" className="transition-colors hover:text-zinc-300">
        Log in
      </Link>
    </p>
  );
}
