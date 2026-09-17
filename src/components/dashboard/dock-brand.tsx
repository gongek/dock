import Link from "next/link";

export function DockBrand({
  href = "/dashboard",
  shrinkProgress = 0,
}: {
  href?: string;
  shrinkProgress?: number;
}) {
  const logoSize = 32 - 8 * shrinkProgress;
  const fontSize = 20 - 4 * shrinkProgress;
  const gap = 10 - 2 * shrinkProgress;

  return (
    <Link
      href={href}
      className="flex items-center transition-opacity hover:opacity-80"
      style={{ gap }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/dock-logo.svg"
        alt=""
        width={logoSize}
        height={logoSize}
        className="shrink-0"
        style={{ width: logoSize, height: logoSize }}
      />
      <span
        className="font-medium tracking-wide text-zinc-100"
        style={{ fontSize }}
      >
        Dock
      </span>
    </Link>
  );
}
