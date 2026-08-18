import Link from "next/link";

export function SiteFooter() {
  return (
    <p className="pb-6 text-center text-xs text-zinc-500">
      Coming soon
      <span className="mx-1.5">•</span>
      <Link href="/signin" className="transition-colors hover:text-zinc-300">
        Sign in
      </Link>
    </p>
  );
}
