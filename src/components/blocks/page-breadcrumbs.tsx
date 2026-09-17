import type { BlockRenderContext } from "@/lib/blocks/types";

export type BreadcrumbType = "minimal" | "bar";

export const BREADCRUMB_TYPE_OPTIONS: {
  label: string;
  value: BreadcrumbType;
  description?: string;
}[] = [
  { label: "Minimal", value: "minimal", description: "Inline text trail" },
  { label: "Bar", value: "bar", description: "Full-width bar above content" },
];

export function PageBreadcrumbs({
  context,
  type = "minimal",
  className = "",
  homeHref = "/",
}: {
  context: BlockRenderContext;
  type?: BreadcrumbType;
  className?: string;
  homeHref?: string;
}) {
  const pageTitle = context.page?.title ?? "Page";
  const slug = context.page?.slug ?? "home";
  const isHome = slug === "home";
  const homeLink =
    context.mode === "builder" ? (
      <span className="hover:text-zinc-300">Home</span>
    ) : (
      <a href={homeHref} className="hover:text-zinc-300">
        Home
      </a>
    );

  const trail = isHome ? (
    <span className="text-zinc-300">{pageTitle}</span>
  ) : (
    <>
      {homeLink}
      <span className="mx-1.5">/</span>
      <span className="text-zinc-300">{pageTitle}</span>
    </>
  );

  return (
    <nav
      aria-label="Breadcrumb"
      className={`text-xs text-zinc-500 ${className}`.trim()}
    >
      {type === "bar" ? (
        <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2">
          {trail}
        </div>
      ) : (
        trail
      )}
    </nav>
  );
}
