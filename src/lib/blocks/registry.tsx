import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { BlockRegistryEntry, BlockRenderContext } from "./types";
import { createBlockId } from "./types";
import { renderTemplateString, TemplateText } from "@/lib/variables/template-text";
import { resolveCaseHref } from "@/lib/cases/resolve-case-url";
import { boxPaddingStyle, readBoxPadding, textAlignStyle } from "@/lib/blocks/layout";
import { InlineEditableText } from "./inline-edit";
import { RichTextView } from "./rich-text-view";
import { DEFAULT_TABLE_CELLS } from "./table";
import { TableView } from "./table-view";
import { GraphView, parseGraphPoints, type GraphKind } from "./graph-view";

function text(value: unknown, context: BlockRenderContext): string {
  return renderTemplateString(String(value ?? ""), context);
}

function Tpl({
  value,
  context,
  fallback,
}: {
  value: unknown;
  context: BlockRenderContext;
  fallback?: string;
}) {
  const raw = String(value ?? "");
  return <TemplateText value={raw || fallback || ""} context={context} />;
}

function BlockLink({
  href,
  className,
  children,
  context,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  context: BlockRenderContext;
}) {
  if (context.mode === "builder") {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function resolveImageUrl(
  props: Record<string, unknown>,
  context: BlockRenderContext,
): string {
  const bakedUrl = text(props.url, context);
  if (bakedUrl) return bakedUrl;
  const r2Key = (props.r2Key as string | undefined) || (props.storageId as string | undefined);
  if (r2Key && context.mediaUrlResolver) {
    const resolved = context.mediaUrlResolver(r2Key);
    if (resolved) return resolved;
  }
  return "";
}

const HEADING_LEVELS = {
  1: { tag: "h1" as const, size: "text-2xl", color: "text-zinc-100", fontSize: "1.5rem", lineHeight: "2rem" },
  2: { tag: "h2" as const, size: "text-xl", color: "text-zinc-100", fontSize: "1.25rem", lineHeight: "1.75rem" },
  3: { tag: "h3" as const, size: "text-base", color: "text-zinc-200", fontSize: "1rem", lineHeight: "1.5rem" },
};

const heading: BlockRegistryEntry = {
  definition: {
    type: "heading",
    label: "Heading",
    defaultProps: { text: "Heading", level: 2 },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "text", label: "Text", variable: true },
    {
      kind: "select",
      id: "level",
      label: "Level",
      options: [
        { label: "H1", value: "1" },
        { label: "H2", value: "2" },
        { label: "H3", value: "3" },
      ],
    },
  ],
  render(props, context) {
    const appearance =
      HEADING_LEVELS[Number(props.level ?? 2) as 1 | 2 | 3] ?? HEADING_LEVELS[2];
    const content = String(props.text ?? "");
    const blockId = String(props._blockId ?? "");
    const animateSize = context.mode === "builder";
    const className = [
      "w-full font-medium",
      appearance.color,
      animateSize
        ? "transition-[font-size,line-height,color] duration-300 ease-out motion-reduce:transition-none"
        : appearance.size,
    ].join(" ");
    const Tag = animateSize ? "h2" : appearance.tag;
    const alignStyle = {
      ...textAlignStyle(props),
      ...(animateSize
        ? { fontSize: appearance.fontSize, lineHeight: appearance.lineHeight }
        : {}),
    };
    if (context.mode === "builder" && blockId) {
      return (
        <InlineEditableText
          blockId={blockId}
          fieldId="text"
          value={content}
          tag={Tag}
          className={className}
          style={alignStyle}
          context={context}
        />
      );
    }
    return (
      <Tag className={className} style={alignStyle}>
        <Tpl value={content} context={context} />
      </Tag>
    );
  },
};

const textBlock: BlockRegistryEntry = {
  definition: {
    type: "text",
    label: "Text",
    defaultProps: { text: "Write something..." },
    createId: createBlockId,
  },
  fields: [{ kind: "textarea", id: "text", label: "Text", variable: true }],
  render(props, context) {
    const content = String(props.text ?? "");
    const blockId = String(props._blockId ?? "");
    const alignStyle = textAlignStyle(props);
    if (context.mode === "builder" && blockId) {
      return (
        <InlineEditableText
          blockId={blockId}
          fieldId="text"
          value={content}
          tag="p"
          multiline
          rich
          className="w-full text-sm leading-6 text-zinc-300"
          style={alignStyle}
          context={context}
        />
      );
    }
    return (
      <RichTextView
        value={content}
        className="w-full text-sm leading-6 text-zinc-300"
        style={alignStyle}
        tag="p"
        context={context}
      />
    );
  },
};

const image: BlockRegistryEntry = {
  definition: {
    type: "image",
    label: "Image",
    defaultProps: { url: "", alt: "", storageId: "", r2Key: "" },
    createId: createBlockId,
  },
  fields: [
    { kind: "media", id: "storageId", label: "Image" },
    { kind: "text", id: "url", label: "Image URL (fallback)", variable: true },
    { kind: "text", id: "alt", label: "Alt text", variable: true },
  ],
  render(props, context) {
    const url = resolveImageUrl(props, context);
    if (!url) {
      if (context.mode === "builder") {
        return (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 text-xs text-zinc-500">
            Choose an image from the Media tab or inspector
          </div>
        );
      }
      return null;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={text(props.alt, context)}
        className={
          Number(props.boxHeight) > 0
            ? "h-full w-full rounded-xl border border-zinc-800 object-cover"
            : "max-w-full rounded-xl border border-zinc-800"
        }
      />
    );
  },
};

const button: BlockRegistryEntry = {
  definition: {
    type: "button",
    label: "Button",
    defaultProps: { label: "Learn more", href: "/", variant: "primary", action: "link" },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "label", label: "Label", variable: true },
    { kind: "text", id: "href", label: "Link", variable: true },
    {
      kind: "select",
      id: "action",
      label: "Action",
      options: [
        { label: "Link", value: "link" },
        { label: "Reload page", value: "reload" },
      ],
    },
    {
      kind: "select",
      id: "variant",
      label: "Style",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Ghost", value: "ghost" },
      ],
    },
  ],
  render(props, context) {
    const label = <Tpl value={props.label} context={context} fallback="Button" />;
    const className =
      props.variant === "ghost"
        ? "inline-flex rounded-full border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition-colors hover:border-zinc-500"
        : "inline-flex rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white";

    if (props.action === "reload" && context.mode !== "builder") {
      return (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={className}
        >
          {label}
        </button>
      );
    }

    const href = text(props.href, context) || "/";
    return (
      <BlockLink href={href} className={className} context={context}>
        {label}
      </BlockLink>
    );
  },
};

const nav: BlockRegistryEntry = {
  definition: {
    type: "nav",
    label: "Navigation",
    defaultProps: { style: "inline", text: "" },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "text", label: "Brand text", variable: true },
    {
      kind: "select",
      id: "style",
      label: "Style",
      options: [
        { label: "Inline", value: "inline" },
        { label: "Stacked", value: "stacked" },
        { label: "Pills", value: "pills" },
      ],
    },
  ],
  render(props, context) {
    const pages = (context.pages ?? []).filter(
      (page) => page.showInNav !== false,
    );
    const stacked = props.style === "stacked";
    const pills = props.style === "pills";
    const brand = String(props.text ?? "");
    const blockId = String(props._blockId ?? "");
    const linkClass = pills
      ? "rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
      : "text-sm text-zinc-400 transition-colors hover:text-zinc-200";
    return (
      <nav
        className={
          stacked
            ? "flex flex-col gap-2"
            : "flex flex-wrap items-center gap-3"
        }
      >
        {brand ? (
          context.mode === "builder" && blockId ? (
            <InlineEditableText
              blockId={blockId}
              fieldId="text"
              value={brand}
              tag="span"
              className="text-sm font-medium text-zinc-200"
              context={context}
            />
          ) : (
            <span className="text-sm font-medium text-zinc-200">
              <Tpl value={brand} context={context} />
            </span>
          )
        ) : null}
        {pages.map((page) => (
          <BlockLink
            key={page.slug}
            href={page.slug === "home" ? "/" : `/${page.slug}`}
            className={linkClass}
            context={context}
          >
            {page.title}
          </BlockLink>
        ))}
      </nav>
    );
  },
};

const list: BlockRegistryEntry = {
  definition: {
    type: "list",
    label: "List",
    defaultProps: { items: "Item one\nItem two", ordered: false },
    createId: createBlockId,
  },
  fields: [
    { kind: "textarea", id: "items", label: "Items (one per line)", variable: true },
    { kind: "boolean", id: "ordered", label: "Numbered list" },
  ],
  render(props, context) {
    const raw = String(props.items ?? "");
    const items = raw.split("\n").map((line) => line.trim()).filter(Boolean);
    const Tag = props.ordered ? "ol" : "ul";
    return (
      <Tag className={`ml-5 text-sm text-zinc-300 ${props.ordered ? "list-decimal" : "list-disc"}`}>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>
            <Tpl value={item} context={context} />
          </li>
        ))}
      </Tag>
    );
  },
};

const caseCollection: BlockRegistryEntry = {
  definition: {
    type: "case_collection",
    label: "Case collection",
    defaultProps: {
      meridianBotId: "",
      scope: "guild",
      guildKey: "",
      typeFilter: "any",
      statusFilter: "any",
      emptyText: "No cases yet.",
    },
    createId: createBlockId,
  },
  fields: [
    {
      kind: "select",
      id: "scope",
      label: "Scope",
      options: [
        { label: "Guild", value: "guild" },
        { label: "Global", value: "global" },
      ],
    },
    {
      kind: "guild",
      id: "guildKey",
      label: "Guild",
      visibleWhen: (props) => props.scope !== "global",
    },
    { kind: "text", id: "emptyText", label: "Empty state", variable: true },
  ],
  render(props, context) {
    const cases = context.cases ?? [];
    const pattern = context.caseUrlPattern || "/{case_slug}";
    if (cases.length === 0) {
      return (
        <p className="text-sm text-zinc-500">
          <Tpl value={props.emptyText} context={context} />
        </p>
      );
    }
    return (
      <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
        {cases.map((caseRow) => (
          <li key={caseRow.publicSlug} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">
                Case #{caseRow.caseNumber} · {caseRow.type}
              </p>
              <p className="text-xs text-zinc-500">{caseRow.reason ?? "No reason provided"}</p>
            </div>
            <BlockLink
              href={resolveCaseHref(pattern, {
                publicSlug: caseRow.publicSlug,
                caseNumber: caseRow.caseNumber,
              })}
              className="text-xs text-zinc-400 hover:text-zinc-200"
              context={context}
            >
              View
            </BlockLink>
          </li>
        ))}
      </ul>
    );
  },
};

const divider: BlockRegistryEntry = {
  definition: {
    type: "divider",
    label: "Divider",
    defaultProps: { size: "md", style: "line" },
    createId: createBlockId,
  },
  fields: [
    {
      kind: "select",
      id: "size",
      label: "Spacing",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
    {
      kind: "select",
      id: "style",
      label: "Style",
      options: [
        { label: "Line", value: "line" },
        { label: "Spacer", value: "spacer" },
      ],
    },
  ],
  render(props) {
    const sizeClass =
      props.size === "sm" ? "my-3" : props.size === "lg" ? "my-10" : "my-6";
    if (props.style === "spacer") return <div className={sizeClass} aria-hidden="true" />;
    return <hr className={`${sizeClass} border-zinc-800`} />;
  },
};

const spacer: BlockRegistryEntry = {
  definition: {
    type: "spacer",
    label: "Spacer",
    defaultProps: { size: "md" },
    createId: createBlockId,
  },
  fields: [
    {
      kind: "select",
      id: "size",
      label: "Size",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
  ],
  render(props) {
    const sizeClass =
      props.size === "sm" ? "h-4" : props.size === "lg" ? "h-16" : "h-8";
    return <div className={sizeClass} aria-hidden="true" />;
  },
};

const footer: BlockRegistryEntry = {
  definition: {
    type: "footer",
    label: "Footer",
    defaultProps: { text: "Built with Dock" },
    createId: createBlockId,
  },
  fields: [{ kind: "text", id: "text", label: "Text", variable: true }],
  render(props, context) {
    return (
      <footer className="border-t border-zinc-800 pt-6 text-center text-xs text-zinc-500">
        <p>
          <Tpl value={props.text} context={context} />
        </p>
      </footer>
    );
  },
};

const section: BlockRegistryEntry = {
  definition: {
    type: "section",
    label: "Section",
    defaultProps: { padding: 32, paddingX: 0, align: "left" },
    createId: createBlockId,
    isContainer: true,
  },
  fields: [
    { kind: "number", id: "padding", label: "Padding", min: 0 },
    { kind: "number", id: "paddingX", label: "Inside", min: 0 },
    {
      kind: "select",
      id: "align",
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
  ],
  render(props, _context, children) {
    const padding = readBoxPadding(props);
    const align =
      props.align === "center"
        ? "text-center items-center"
        : props.align === "right"
          ? "text-right items-end"
          : "";
    return (
      <section className={`flex flex-col gap-4 ${align}`} style={boxPaddingStyle(padding)}>
        {children}
      </section>
    );
  },
};

const columns: BlockRegistryEntry = {
  definition: {
    type: "columns",
    label: "Columns",
    defaultProps: { count: 2 },
    createId: createBlockId,
    isContainer: true,
  },
  fields: [
    {
      kind: "select",
      id: "count",
      label: "Columns",
      options: [
        { label: "2 columns", value: "2" },
        { label: "3 columns", value: "3" },
      ],
    },
  ],
  render(props, _context, children) {
    const count = Number(props.count ?? 2);
    const gridClass = count === 3 ? "grid-cols-3" : "grid-cols-2";
    return (
      <div
        className={`grid ${gridClass} items-stretch gap-8 sm:gap-12`}
        data-columns={count}
      >
        {children}
      </div>
    );
  },
};

function youtubeVideoId(parsed: URL): string | null {
  const fromQuery = parsed.searchParams.get("v");
  if (fromQuery) return fromQuery;

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (["embed", "shorts", "live", "v"].includes(parts[0])) {
    return parts[1] ?? null;
  }
  return null;
}

function resolveEmbedUrl(rawUrl: string): string | null {
  const url = rawUrl.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const videoId = youtubeVideoId(parsed);
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (host === "youtu.be") {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (host === "vimeo.com") {
      const videoId = parsed.pathname.split("/").filter(Boolean).pop();
      if (videoId) return `https://player.vimeo.com/video/${videoId}`;
    }
    if (host === "player.vimeo.com" && parsed.pathname.startsWith("/video/")) {
      return url;
    }
  } catch {
    return null;
  }

  return null;
}

function VideoEmbed({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-zinc-800">
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

type AudioEmbed = {
  src: string;
  height: number;
};

const SPOTIFY_TYPES = new Set([
  "album",
  "playlist",
  "track",
  "artist",
  "show",
  "episode",
  "audiobook",
]);

function resolveSpotifyEmbed(parsed: URL): AudioEmbed | null {
  const host = parsed.hostname.replace(/^www\./, "");
  if (host !== "open.spotify.com") return null;

  const parts = parsed.pathname.split("/").filter(Boolean);
  let index = 0;
  if (parts[0]?.startsWith("intl-")) index += 1;
  if (parts[index] === "embed") index += 1;
  if (parts[index] === "user" && parts[index + 2] === "playlist") {
    const id = parts[index + 3];
    if (!id) return null;
    return { src: `https://open.spotify.com/embed/playlist/${id}`, height: 352 };
  }

  const type = parts[index];
  const id = parts[index + 1];
  if (!type || !id || !SPOTIFY_TYPES.has(type)) return null;

  const compact = type === "track" || type === "episode";
  return {
    src: `https://open.spotify.com/embed/${type}/${id}`,
    height: compact ? 152 : 352,
  };
}

function resolveSoundCloudEmbed(parsed: URL): AudioEmbed | null {
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "w.soundcloud.com" && parsed.pathname.startsWith("/player")) {
    return { src: parsed.toString(), height: 166 };
  }
  if (host !== "soundcloud.com" && host !== "m.soundcloud.com") {
    return null;
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const encoded = encodeURIComponent(`${parsed.origin}${parsed.pathname}`);
  return {
    src: `https://w.soundcloud.com/player/?url=${encoded}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`,
    height: 166,
  };
}

function resolveAppleAudioEmbed(parsed: URL): AudioEmbed | null {
  const host = parsed.hostname.replace(/^www\./, "");
  const embedUrl = new URL(parsed.toString());
  if (host === "embed.music.apple.com" || host === "embed.podcasts.apple.com") {
    const isSong = parsed.pathname.includes("/song") || parsed.searchParams.has("i");
    return { src: embedUrl.toString(), height: isSong ? 175 : 450 };
  }
  if (host === "music.apple.com" || host === "geo.music.apple.com") {
    embedUrl.hostname = "embed.music.apple.com";
    const isSong = parsed.pathname.includes("/song") || parsed.searchParams.has("i");
    return { src: embedUrl.toString(), height: isSong ? 175 : 450 };
  }
  if (host === "podcasts.apple.com") {
    embedUrl.hostname = "embed.podcasts.apple.com";
    return { src: embedUrl.toString(), height: 450 };
  }
  return null;
}

function resolveDeezerEmbed(parsed: URL): AudioEmbed | null {
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "widget.deezer.com") {
    const compact = parsed.pathname.includes("/track/");
    return { src: parsed.toString(), height: compact ? 165 : 300 };
  }
  if (host !== "deezer.com") return null;

  const parts = parsed.pathname.split("/").filter(Boolean);
  const typeIndex = parts[0]?.length === 2 ? 1 : 0;
  const type = parts[typeIndex];
  const id = parts[typeIndex + 1];
  const allowed = new Set(["track", "album", "playlist", "artist", "podcast", "episode", "radio"]);
  if (!type || !id || !allowed.has(type)) return null;
  return {
    src: `https://widget.deezer.com/widget/dark/${type}/${id}`,
    height: type === "track" ? 165 : 300,
  };
}

function resolveMixcloudEmbed(parsed: URL): AudioEmbed | null {
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "player-widget.mixcloud.com") {
    return { src: parsed.toString(), height: 180 };
  }
  if (host !== "mixcloud.com") return null;
  if (parsed.pathname.startsWith("/widget/iframe")) {
    return { src: parsed.toString(), height: 180 };
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const feed = parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
  return {
    src: `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&feed=${encodeURIComponent(feed)}`,
    height: 180,
  };
}

function resolveAudiomackEmbed(parsed: URL): AudioEmbed | null {
  const host = parsed.hostname.replace(/^www\./, "");
  if (host !== "audiomack.com") return null;
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0] === "embed") {
    return { src: parsed.toString(), height: 252 };
  }
  if (parts.length < 3) return null;
  const type = parts[1];
  if (!["song", "album", "playlist"].includes(type)) return null;
  return {
    src: `https://audiomack.com/embed/${type}/${parts[0]}/${parts[2]}`,
    height: 252,
  };
}

function resolveAudioEmbed(rawUrl: string): AudioEmbed | null {
  const url = rawUrl.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return (
      resolveSpotifyEmbed(parsed) ??
      resolveSoundCloudEmbed(parsed) ??
      resolveAppleAudioEmbed(parsed) ??
      resolveDeezerEmbed(parsed) ??
      resolveMixcloudEmbed(parsed) ??
      resolveAudiomackEmbed(parsed)
    );
  } catch {
    return null;
  }
}

function AudioEmbedFrame({
  src,
  height,
  title,
}: {
  src: string;
  height: number;
  title: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-zinc-800"
      style={{ height }}
    >
      <iframe
        src={src}
        title={title}
        className="size-full"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}

const linkBlock: BlockRegistryEntry = {
  definition: {
    type: "link",
    label: "Link",
    defaultProps: { label: "Learn more", href: "/", openInNewTab: false },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "label", label: "Label", variable: true },
    { kind: "text", id: "href", label: "URL", variable: true },
    { kind: "boolean", id: "openInNewTab", label: "Open in new tab" },
  ],
  render(props, context) {
    const href = text(props.href, context) || "/";
    if (context.mode === "builder") {
      return (
        <span className="text-sm text-sky-400 underline decoration-sky-400/40 underline-offset-2">
          <Tpl value={props.label} context={context} fallback="Link" />
        </span>
      );
    }
    return (
      <Link
        href={href}
        target={props.openInNewTab ? "_blank" : undefined}
        rel={props.openInNewTab ? "noopener noreferrer" : undefined}
        className="text-sm text-sky-400 underline decoration-sky-400/40 underline-offset-2 transition-colors hover:text-sky-300"
      >
        <Tpl value={props.label} context={context} fallback="Link" />
      </Link>
    );
  },
};

const badge: BlockRegistryEntry = {
  definition: {
    type: "badge",
    label: "Badge",
    defaultProps: { text: "New", variant: "default" },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "text", label: "Text", variable: true },
    {
      kind: "select",
      id: "variant",
      label: "Style",
      options: [
        { label: "Default", value: "default" },
        { label: "Primary", value: "primary" },
        { label: "Success", value: "success" },
        { label: "Warning", value: "warning" },
      ],
    },
  ],
  render(props, context) {
    const variant = String(props.variant ?? "default");
    const className =
      variant === "primary"
        ? "border-sky-800/60 bg-sky-950/50 text-sky-300"
        : variant === "success"
          ? "border-emerald-800/60 bg-emerald-950/50 text-emerald-300"
          : variant === "warning"
            ? "border-amber-800/60 bg-amber-950/50 text-amber-300"
            : "border-zinc-700 bg-zinc-900 text-zinc-300";
    return (
      <span
        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${className}`}
      >
        <Tpl value={props.text} context={context} fallback="Badge" />
      </span>
    );
  },
};

const quote: BlockRegistryEntry = {
  definition: {
    type: "quote",
    label: "Quote",
    defaultProps: { text: "Add a quote or testimonial here.", author: "" },
    createId: createBlockId,
  },
  fields: [
    { kind: "textarea", id: "text", label: "Quote", variable: true },
    { kind: "text", id: "author", label: "Author", variable: true },
  ],
  render(props, context) {
    return (
      <figure className="border-l-2 border-zinc-600 pl-4">
        <blockquote className="text-sm italic leading-6 text-zinc-300">
          <Tpl value={props.text} context={context} />
        </blockquote>
        {String(props.author ?? "") ? (
          <figcaption className="mt-2 text-xs text-zinc-500">
            — <Tpl value={props.author} context={context} />
          </figcaption>
        ) : null}
      </figure>
    );
  },
};

const callout: BlockRegistryEntry = {
  definition: {
    type: "callout",
    label: "Callout",
    defaultProps: {
      title: "Note",
      body: "Share an important message with your visitors.",
      variant: "info",
    },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "title", label: "Title", variable: true },
    { kind: "textarea", id: "body", label: "Body", variable: true },
    {
      kind: "select",
      id: "variant",
      label: "Style",
      options: [
        { label: "Info", value: "info" },
        { label: "Success", value: "success" },
        { label: "Warning", value: "warning" },
        { label: "Error", value: "error" },
      ],
    },
  ],
  render(props, context) {
    const variant = String(props.variant ?? "info");
    const styles =
      variant === "success"
        ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-100"
        : variant === "warning"
          ? "border-amber-800/60 bg-amber-950/30 text-amber-100"
          : variant === "error"
            ? "border-red-800/60 bg-red-950/30 text-red-100"
            : "border-sky-800/60 bg-sky-950/30 text-sky-100";
    return (
      <div className={`rounded-xl border px-4 py-3 ${styles}`}>
        <p className="text-sm font-medium">
          <Tpl value={props.title} context={context} />
        </p>
        <p className="mt-1 text-sm leading-6 opacity-90">
          <Tpl value={props.body} context={context} />
        </p>
      </div>
    );
  },
};

function FaqDisclosure({
  question,
  answer,
  openByDefault,
  accordionName,
}: {
  question: ReactNode;
  answer: ReactNode;
  openByDefault: boolean;
  accordionName?: string;
}) {
  const [open, setOpen] = useState(openByDefault);

  useEffect(() => {
    setOpen(openByDefault);
  }, [openByDefault]);

  return (
    <details
      className="group w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 open:pb-4"
      open={open}
      name={accordionName}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-zinc-100 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{question}</span>
        <i
          className="bx bx-chevron-down shrink-0 text-lg leading-none text-zinc-500 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{answer}</p>
    </details>
  );
}

const faq: BlockRegistryEntry = {
  definition: {
    type: "faq",
    label: "FAQ",
    defaultProps: {
      question: "How do I join?",
      answer: "Open Discord, accept the invite, and complete verification in #welcome.",
      defaultOpen: false,
    },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "question", label: "Question", variable: true },
    { kind: "textarea", id: "answer", label: "Answer", variable: true },
    { kind: "boolean", id: "defaultOpen", label: "Open by default" },
  ],
  render(props, context) {
    return (
      <FaqDisclosure
        question={<Tpl value={props.question} context={context} fallback="Question" />}
        answer={<Tpl value={props.answer} context={context} />}
        openByDefault={Boolean(props.defaultOpen)}
        accordionName={context.mode === "builder" ? undefined : "faq"}
      />
    );
  },
};

const codeBlock: BlockRegistryEntry = {
  definition: {
    type: "code",
    label: "Code",
    defaultProps: { content: "console.log('Hello, world!');", language: "" },
    createId: createBlockId,
  },
  fields: [
    { kind: "textarea", id: "content", label: "Code" },
    { kind: "text", id: "language", label: "Language label (optional)" },
  ],
  render(props) {
    const content = String(props.content ?? "");
    const language = String(props.language ?? "").trim();
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        {language ? (
          <div className="border-b border-zinc-800 px-4 py-2 text-[10px] uppercase tracking-wider text-zinc-500">
            {language}
          </div>
        ) : null}
        <pre className="overflow-x-auto p-4 text-xs leading-6 text-zinc-300">
          <code>{content}</code>
        </pre>
      </div>
    );
  },
};

const embed: BlockRegistryEntry = {
  definition: {
    type: "embed",
    label: "Embed",
    defaultProps: { url: "", aspectRatio: "16:9" },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "url", label: "YouTube or Vimeo URL", variable: true },
    {
      kind: "select",
      id: "aspectRatio",
      label: "Aspect ratio",
      options: [
        { label: "16:9", value: "16:9" },
        { label: "4:3", value: "4:3" },
        { label: "1:1", value: "1:1" },
      ],
    },
  ],
  render(props, context) {
    const rawUrl = text(props.url, context);
    const embedUrl = resolveEmbedUrl(rawUrl);
    const aspectClass =
      props.aspectRatio === "4:3"
        ? "aspect-[4/3]"
        : props.aspectRatio === "1:1"
          ? "aspect-square"
          : "aspect-video";

    if (!embedUrl) {
      if (context.mode === "builder") {
        return (
          <div
            className={`flex ${aspectClass} items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-4 text-center text-xs text-zinc-500`}
          >
            Paste a YouTube or Vimeo URL in the inspector
          </div>
        );
      }
      return null;
    }

    return (
      <div className={`relative overflow-hidden rounded-xl border border-zinc-800 ${aspectClass}`}>
        <iframe
          src={embedUrl}
          title="Embedded media"
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  },
};

const card: BlockRegistryEntry = {
  definition: {
    type: "card",
    label: "Card",
    defaultProps: { title: "", padding: "md" },
    createId: createBlockId,
    isContainer: true,
  },
  fields: [
    { kind: "text", id: "title", label: "Title (optional)", variable: true },
    {
      kind: "select",
      id: "padding",
      label: "Padding",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
  ],
  render(props, context, children) {
    const padding =
      props.padding === "sm" ? "p-4" : props.padding === "lg" ? "p-8" : "p-6";
    const titleRaw = String(props.title ?? "");
    return (
      <div className={`flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 ${padding}`}>
        {titleRaw ? (
          <p className="text-sm font-medium text-zinc-200">
            <Tpl value={props.title} context={context} />
          </p>
        ) : null}
        {children}
      </div>
    );
  },
};

const group: BlockRegistryEntry = {
  definition: {
    type: "group",
    label: "Group",
    defaultProps: { gap: "md" },
    createId: createBlockId,
    isContainer: true,
  },
  fields: [
    {
      kind: "select",
      id: "gap",
      label: "Gap",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
  ],
  render(props, _context, children) {
    const gap =
      props.gap === "sm" ? "gap-2" : props.gap === "lg" ? "gap-8" : "gap-4";
    return <div className={`flex flex-col ${gap}`}>{children}</div>;
  },
};

const row: BlockRegistryEntry = {
  definition: {
    type: "row",
    label: "Row",
    defaultProps: { gap: "md", align: "left", justify: "start", wrap: true },
    createId: createBlockId,
    isContainer: true,
  },
  fields: [
    {
      kind: "select",
      id: "gap",
      label: "Gap",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
    {
      kind: "select",
      id: "justify",
      label: "Justify",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "Space between", value: "between" },
        { label: "End", value: "end" },
      ],
    },
    { kind: "boolean", id: "wrap", label: "Wrap items" },
  ],
  render(props, _context, children) {
    const gap =
      props.gap === "sm" ? "gap-2" : props.gap === "lg" ? "gap-8" : "gap-4";
    const align =
      props.align === "center"
        ? "items-center"
        : props.align === "right"
          ? "items-end"
          : "items-start";
    const justify =
      props.justify === "center"
        ? "justify-center"
        : props.justify === "between"
          ? "justify-between"
          : props.justify === "end"
            ? "justify-end"
            : "justify-start";
    const wrap = props.wrap === false ? "flex-nowrap overflow-x-auto" : "flex-wrap";
    return <div className={`flex w-full ${wrap} ${align} ${justify} ${gap}`}>{children}</div>;
  },
};

function lines(value: unknown, context: BlockRenderContext): string[] {
  return text(value, context)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function pipeCells(line: string): string[] {
  return line.split("|").map((cell) => cell.trim());
}

function httpUrl(value: string): string | null {
  const url = value.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  } catch {
    return null;
  }
  return null;
}

const stat: BlockRegistryEntry = {
  definition: {
    type: "stat",
    label: "Stat",
    defaultProps: { value: "12k+", label: "Members", hint: "" },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "value", label: "Value", variable: true },
    { kind: "text", id: "label", label: "Label", variable: true },
    { kind: "text", id: "hint", label: "Hint (optional)", variable: true },
  ],
  render(props, context) {
    const hint = String(props.hint ?? "");
    return (
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-medium text-zinc-100">
          <Tpl value={props.value} context={context} fallback="0" />
        </p>
        <p className="text-sm text-zinc-300">
          <Tpl value={props.label} context={context} fallback="Stat" />
        </p>
        {hint ? (
          <p className="text-xs text-zinc-500">
            <Tpl value={props.hint} context={context} />
          </p>
        ) : null}
      </div>
    );
  },
};

const avatar: BlockRegistryEntry = {
  definition: {
    type: "avatar",
    label: "Avatar",
    defaultProps: {
      url: "",
      alt: "",
      storageId: "",
      r2Key: "",
      name: "Alex",
      role: "Moderator",
    },
    createId: createBlockId,
  },
  fields: [
    { kind: "media", id: "storageId", label: "Photo" },
    { kind: "text", id: "url", label: "Image URL (fallback)", variable: true },
    { kind: "text", id: "name", label: "Name", variable: true },
    { kind: "text", id: "role", label: "Role", variable: true },
    { kind: "text", id: "alt", label: "Alt text", variable: true },
  ],
  render(props, context) {
    const url = resolveImageUrl(props, context);
    const nameRaw = String(props.name ?? "");
    const roleRaw = String(props.role ?? "");
    const name = text(props.name, context) || "Name";
    const initial = (nameRaw || name).slice(0, 1).toUpperCase();
    return (
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={text(props.alt, context) || name}
            className="size-12 shrink-0 rounded-full border border-zinc-800 object-cover"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-sm font-medium text-zinc-300">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">
            <Tpl value={props.name} context={context} fallback="Name" />
          </p>
          {roleRaw ? (
            <p className="truncate text-xs text-zinc-500">
              <Tpl value={props.role} context={context} />
            </p>
          ) : null}
        </div>
      </div>
    );
  },
};

const ICON_OPTIONS = [
  { label: "Star", value: "bx-star" },
  { label: "Check", value: "bx-check-circle" },
  { label: "Shield", value: "bx-shield" },
  { label: "Group", value: "bx-group" },
  { label: "Chat", value: "bx-message" },
  { label: "Lock", value: "bx-lock-alt" },
  { label: "Bot", value: "bx-bot" },
  { label: "Calendar", value: "bx-calendar" },
  { label: "Heart", value: "bx-heart" },
  { label: "Globe", value: "bx-globe" },
];

const iconBlock: BlockRegistryEntry = {
  definition: {
    type: "icon",
    label: "Icon",
    defaultProps: {
      icon: "bx-star",
      title: "Feature",
      body: "Describe this highlight in a sentence.",
    },
    createId: createBlockId,
  },
  fields: [
    { kind: "select", id: "icon", label: "Icon", options: ICON_OPTIONS },
    { kind: "text", id: "title", label: "Title", variable: true },
    { kind: "textarea", id: "body", label: "Body", variable: true },
  ],
  render(props, context) {
    const icon = ICON_OPTIONS.some((option) => option.value === props.icon)
      ? String(props.icon)
      : "bx-star";
    const titleRaw = String(props.title ?? "");
    const bodyRaw = String(props.body ?? "");
    return (
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200">
          <i className={`bx ${icon} text-lg`} aria-hidden />
        </div>
        <div className="min-w-0">
          {titleRaw ? (
            <p className="text-sm font-medium text-zinc-100">
              <Tpl value={props.title} context={context} />
            </p>
          ) : null}
          {bodyRaw ? (
            <p className="mt-1 text-sm leading-6 text-zinc-300">
              <Tpl value={props.body} context={context} />
            </p>
          ) : null}
        </div>
      </div>
    );
  },
};

const SOCIAL_ICONS: Record<string, string> = {
  discord: "bxl-discord-alt",
  twitter: "bxl-twitter",
  x: "bxl-twitter",
  youtube: "bxl-youtube",
  github: "bxl-github",
  instagram: "bxl-instagram",
  twitch: "bxl-twitch",
  tiktok: "bxl-tiktok",
  website: "bx-globe",
  web: "bx-globe",
  link: "bx-link",
};

const social: BlockRegistryEntry = {
  definition: {
    type: "social",
    label: "Social links",
    defaultProps: {
      items: "Discord | https://discord.gg/\nYouTube | https://youtube.com/",
      style: "pills",
    },
    createId: createBlockId,
  },
  fields: [
    {
      kind: "select",
      id: "style",
      label: "Style",
      options: [
        { label: "Pills", value: "pills" },
        { label: "Icons", value: "icons" },
        { label: "List", value: "list" },
      ],
    },
    {
      kind: "social-links",
      id: "items",
      label: "Links",
      variable: true,
    },
  ],
  render(props, context) {
    const items = lines(props.items, context)
      .map((line) => {
        const [label, ...rest] = pipeCells(line);
        const href = httpUrl(rest.join("|"));
        if (!label || !href) return null;
        const key = label.toLowerCase();
        return { label, href, icon: SOCIAL_ICONS[key] ?? "bx-link" };
      })
      .filter((item): item is { label: string; href: string; icon: string } => item !== null);

    if (items.length === 0) {
      return <p className="text-sm text-zinc-500">Add social links in the inspector</p>;
    }

    const style = String(props.style ?? "pills");
    if (style === "list") {
      return (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={`${item.label}-${item.href}`}>
              <BlockLink href={item.href} className="text-sm text-sky-400 hover:text-sky-300" context={context}>
                <Tpl value={item.label} context={context} />
              </BlockLink>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <BlockLink
            key={`${item.label}-${item.href}`}
            href={item.href}
            className={
              style === "icons"
                ? "inline-flex size-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-200 hover:border-zinc-600"
                : "inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-600"
            }
            context={context}
          >
            <i className={`bx ${item.icon} text-base`} aria-hidden />
            {style === "icons" ? (
              <span className="sr-only">
                <Tpl value={item.label} context={context} />
              </span>
            ) : (
              <Tpl value={item.label} context={context} />
            )}
          </BlockLink>
        ))}
      </div>
    );
  },
};

const tableBlock: BlockRegistryEntry = {
  definition: {
    type: "table",
    label: "Table",
    defaultProps: { cells: DEFAULT_TABLE_CELLS.map((row) => [...row]) },
    createId: createBlockId,
  },
  fields: [{ kind: "table", id: "cells", label: "Table", variable: true }],
  render(props, context) {
    return <TableView props={props} context={context} />;
  },
};

const video: BlockRegistryEntry = {
  definition: {
    type: "video",
    label: "Video",
    defaultProps: { url: "" },
    createId: createBlockId,
  },
  fields: [{ kind: "text", id: "url", label: "YouTube, Vimeo, or video URL", variable: true }],
  render(props, context) {
    const rawUrl = text(props.url, context);
    const embedUrl = resolveEmbedUrl(rawUrl);
    if (embedUrl) {
      return <VideoEmbed src={embedUrl} title="Video" />;
    }

    const url = httpUrl(rawUrl);
    if (!url) {
      if (context.mode === "builder") {
        return (
          <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-4 text-center text-xs text-zinc-500">
            Paste a YouTube, Vimeo, or direct video URL in the inspector
          </div>
        );
      }
      return null;
    }
    return (
      <video
        src={url}
        controls
        className="w-full rounded-xl border border-zinc-800"
      />
    );
  },
};

const audio: BlockRegistryEntry = {
  definition: {
    type: "audio",
    label: "Audio",
    defaultProps: { url: "", title: "" },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "title", label: "Title (optional)", variable: true },
    { kind: "text", id: "url", label: "Spotify, SoundCloud, or audio URL", variable: true },
  ],
  render(props, context) {
    const rawUrl = text(props.url, context);
    const titleRaw = String(props.title ?? "");
    const title = text(props.title, context);
    const embed = resolveAudioEmbed(rawUrl);
    if (embed) {
      return (
        <div className="flex flex-col gap-2">
          {titleRaw ? (
            <p className="text-sm text-zinc-300">
              <Tpl value={props.title} context={context} />
            </p>
          ) : null}
          <AudioEmbedFrame src={embed.src} height={embed.height} title={title || "Audio"} />
        </div>
      );
    }

    const url = httpUrl(rawUrl);
    if (!url) {
      if (context.mode === "builder") {
        return (
          <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-4 text-center text-xs text-zinc-500">
            Paste a Spotify, SoundCloud, or direct audio URL in the inspector
          </div>
        );
      }
      return null;
    }
    return (
      <div className="flex flex-col gap-2">
        {titleRaw ? (
          <p className="text-sm text-zinc-300">
            <Tpl value={props.title} context={context} />
          </p>
        ) : null}
        <audio src={url} controls className="w-full" />
      </div>
    );
  },
};

function mapEmbedUrl(raw: string): string | null {
  const query = raw.trim();
  if (!query) return null;
  try {
    const parsed = new URL(query);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.includes("google.") && parsed.pathname.includes("/maps")) {
      parsed.searchParams.set("output", "embed");
      return parsed.toString();
    }
    if (host.includes("openstreetmap.org") || host.includes("maps.google.")) {
      return parsed.toString();
    }
  } catch {
    // Treat as an address query.
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

const map: BlockRegistryEntry = {
  definition: {
    type: "map",
    label: "Map",
    defaultProps: { query: "" },
    createId: createBlockId,
  },
  fields: [{ kind: "text", id: "query", label: "Address or map URL", variable: true }],
  render(props, context) {
    const embedUrl = mapEmbedUrl(text(props.query, context));
    if (!embedUrl) {
      if (context.mode === "builder") {
        return (
          <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-4 text-center text-xs text-zinc-500">
            Add an address or map URL in the inspector
          </div>
        );
      }
      return null;
    }
    return (
      <div className="relative aspect-video overflow-hidden rounded-xl border border-zinc-800">
        <iframe
          src={embedUrl}
          title="Map"
          className="absolute inset-0 size-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  },
};

const download: BlockRegistryEntry = {
  definition: {
    type: "download",
    label: "Download",
    defaultProps: { label: "Download file", href: "" },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "label", label: "Label", variable: true },
    { kind: "text", id: "href", label: "File URL", variable: true },
  ],
  render(props, context) {
    const href = httpUrl(text(props.href, context)) || "/";
    return (
      <BlockLink
        href={href}
        className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm text-zinc-100 hover:border-zinc-500"
        context={context}
      >
        <i className="bx bx-download text-base" aria-hidden />
        <Tpl value={props.label} context={context} fallback="Download" />
      </BlockLink>
    );
  },
};

const progress: BlockRegistryEntry = {
  definition: {
    type: "progress",
    label: "Progress",
    defaultProps: { label: "Goal", value: 64 },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "label", label: "Label", variable: true },
    { kind: "number", id: "value", label: "Percent", min: 0, max: 100 },
  ],
  render(props, context) {
    const value = Math.min(100, Math.max(0, Number(props.value ?? 0)));
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-zinc-200">
            <Tpl value={props.label} context={context} fallback="Progress" />
          </span>
          <span className="text-zinc-500">{Math.round(value)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-sky-500" style={{ width: `${value}%` }} />
        </div>
      </div>
    );
  },
};

function addCalendarMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() !== day) {
    date.setDate(0);
  }
  return date.getTime();
}

function wholeCalendarMonths(from: number, to: number): { months: number; rest: number } {
  if (to <= from) return { months: 0, rest: 0 };
  const start = new Date(from);
  const end = new Date(to);
  let high =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  let low = 0;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (addCalendarMonths(from, mid) <= to) low = mid;
    else high = mid - 1;
  }
  return { months: low, rest: to - addCalendarMonths(from, low) };
}

type CountdownLargestUnit = "months" | "weeks" | "days";

function countdownUnits(
  from: number,
  to: number,
  largestUnit: CountdownLargestUnit,
): Array<readonly [string, number]> {
  const restTotal = Math.max(0, to - from);
  let rest = restTotal;
  const units: Array<readonly [string, number]> = [];

  if (largestUnit === "months") {
    const { months, rest: leftover } = wholeCalendarMonths(from, to);
    units.push(["Months", months]);
    rest = leftover;
  } else if (largestUnit === "weeks") {
    units.push(["Weeks", Math.floor(rest / 604_800_000)]);
    rest %= 604_800_000;
  }

  units.push(["Days", Math.floor(rest / 86_400_000)]);
  rest %= 86_400_000;
  units.push(["Hours", Math.floor(rest / 3_600_000)]);
  rest %= 3_600_000;
  units.push(["Minutes", Math.floor(rest / 60_000)]);
  rest %= 60_000;
  units.push(["Seconds", Math.floor(rest / 1000)]);
  return units;
}

function CountdownTimer({
  target,
  largestUnit,
}: {
  target: string;
  largestUnit: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const end = Date.parse(target);
  if (!Number.isFinite(end)) {
    return <p className="text-sm text-zinc-500">Set a target date in the inspector</p>;
  }

  const remaining = end - now;
  const countingUp = remaining <= 0;
  const from = countingUp ? end : now;
  const to = countingUp ? now : end;
  const unit: CountdownLargestUnit =
    largestUnit === "weeks" || largestUnit === "days" ? largestUnit : "months";
  const units = countdownUnits(from, to, unit);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        {units.map(([label, value]) => (
          <div
            key={label}
            className="min-w-16 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-center"
          >
            <p className="text-xl font-medium tabular-nums text-zinc-100">
              {String(value).padStart(2, "0")}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
          </div>
        ))}
      </div>
      {countingUp ? (
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">Elapsed</p>
      ) : null}
    </div>
  );
}

const countdown: BlockRegistryEntry = {
  definition: {
    type: "countdown",
    label: "Countdown",
    defaultProps: {
      target: "2026-12-31T00:00:00",
      title: "Event starts in",
      largestUnit: "months",
    },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "title", label: "Title", variable: true },
    { kind: "datetime", id: "target", label: "Target date" },
    {
      kind: "select",
      id: "largestUnit",
      label: "Unit",
      options: [
        { label: "Months", value: "months" },
        { label: "Weeks", value: "weeks" },
        { label: "Days", value: "days" },
      ],
    },
  ],
  render(props, context) {
    const titleRaw = String(props.title ?? "");
    return (
      <div className="flex flex-col gap-3">
        {titleRaw ? (
          <p className="text-sm font-medium text-zinc-200">
            <Tpl value={props.title} context={context} />
          </p>
        ) : null}
        <CountdownTimer
          target={String(props.target ?? "")}
          largestUnit={String(props.largestUnit ?? "months")}
        />
      </div>
    );
  },
};

const timeline: BlockRegistryEntry = {
  definition: {
    type: "timeline",
    label: "Timeline",
    defaultProps: {
      items: "Launch | Now | The public site goes live.\nCases | Next | Members can view public cases.",
    },
    createId: createBlockId,
  },
  fields: [
    {
      kind: "textarea",
      id: "items",
      label: "Items (Title | Date | Body, one per line)",
      variable: true,
    },
  ],
  render(props, context) {
    const items = lines(props.items, context)
      .map((line) => {
        const [title, date, ...rest] = pipeCells(line);
        if (!title) return null;
        return { title, date: date ?? "", body: rest.join(" | ") };
      })
      .filter((item): item is { title: string; date: string; body: string } => item !== null);

    if (items.length === 0) {
      return <p className="text-sm text-zinc-500">Add timeline items in the inspector</p>;
    }

    return (
      <ol className="flex flex-col gap-4 border-l border-zinc-800 pl-4">
        {items.map((item) => (
          <li key={`${item.title}-${item.date}`} className="relative">
            <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border border-zinc-700 bg-zinc-950" />
            <p className="text-sm font-medium text-zinc-100">
              <Tpl value={item.title} context={context} />
            </p>
            {item.date ? (
              <p className="text-xs text-zinc-500">
                <Tpl value={item.date} context={context} />
              </p>
            ) : null}
            {item.body ? (
              <p className="mt-1 text-sm leading-6 text-zinc-300">
                <Tpl value={item.body} context={context} />
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    );
  },
};

const graph: BlockRegistryEntry = {
  definition: {
    type: "graph",
    label: "Graph",
    defaultProps: {
      title: "Activity",
      kind: "line",
      items: "Mon | 12\nTue | 19\nWed | 14\nThu | 22\nFri | 18\nSat | 9\nSun | 11",
    },
    createId: createBlockId,
  },
  fields: [
    { kind: "text", id: "title", label: "Title (optional)", variable: true },
    {
      kind: "select",
      id: "kind",
      label: "Type",
      options: [
        { label: "Line", value: "line" },
        { label: "Area", value: "area" },
        { label: "Bar", value: "bar" },
        { label: "Donut", value: "donut" },
        { label: "Pie", value: "pie" },
      ],
    },
    {
      kind: "textarea",
      id: "items",
      label: "Values (Label | number, one per line or comma-separated)",
      variable: true,
    },
  ],
  render(props, context) {
    const kind = String(props.kind ?? "line") as GraphKind;
    const chartKind: GraphKind =
      kind === "area" || kind === "bar" || kind === "donut" || kind === "pie"
        ? kind
        : "line";
    return (
      <GraphView
        title={
          String(props.title ?? "") ? (
            <Tpl value={props.title} context={context} />
          ) : undefined
        }
        kind={chartKind}
        points={parseGraphPoints(text(props.items, context))}
      />
    );
  },
};

export const BLOCK_REGISTRY: Record<string, BlockRegistryEntry> = {
  heading,
  text: textBlock,
  image,
  button,
  link: linkBlock,
  badge,
  quote,
  callout,
  faq,
  code: codeBlock,
  embed,
  nav,
  list,
  case_collection: caseCollection,
  divider,
  footer,
  spacer,
  section,
  columns,
  group,
  card,
  row,
  stat,
  avatar,
  icon: iconBlock,
  social,
  table: tableBlock,
  video,
  audio,
  map,
  download,
  progress,
  countdown,
  timeline,
  graph,
};

export const BLOCK_PALETTE = Object.values(BLOCK_REGISTRY).map((entry) => entry.definition);

export function getBlockEntry(type: string): BlockRegistryEntry | undefined {
  return BLOCK_REGISTRY[type];
}
