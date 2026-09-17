import Link from "next/link";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { resolveTemplate } from "@/lib/variables/resolve";
import {
  renderTemplateTokens,
  renderTemplateString,
  shouldResolveVariables,
} from "@/lib/variables/template-text";
import type { BlockRenderContext } from "./types";
import { parseRichText, safeHref, type RichNode } from "./rich-text";

export function RichTextView({
  value,
  className,
  style,
  tag: Tag = "p",
  context,
  ...rest
}: {
  value: string;
  className?: string;
  style?: CSSProperties;
  tag?: "span" | "p" | "h1" | "h2" | "h3";
  context: BlockRenderContext;
} & Omit<HTMLAttributes<HTMLElement>, "children">) {
  const nodes = resolveNodes(parseRichText(value), context);
  return (
    <Tag className={className} style={style} {...rest}>
      {renderNodes(nodes, context, "root")}
    </Tag>
  );
}

function resolveNodes(nodes: RichNode[], context: BlockRenderContext): RichNode[] {
  if (!shouldResolveVariables(context)) {
    return nodes;
  }
  return nodes.map((node) => {
    if (node.type === "text" || node.type === "code") {
      return { ...node, value: resolveTemplate(node.value, context) };
    }
    if (node.type === "link") {
      return {
        ...node,
        href: resolveTemplate(node.href, context),
        children: resolveNodes(node.children, context),
      };
    }
    if (node.type === "bold" || node.type === "italic" || node.type === "strike") {
      return { ...node, children: resolveNodes(node.children, context) };
    }
    return node;
  });
}

function renderNodes(
  nodes: RichNode[],
  context: BlockRenderContext,
  keyPrefix: string,
): ReactNode {
  return nodes.map((node, index) => renderNode(node, context, `${keyPrefix}-${index}`));
}

function renderNode(
  node: RichNode,
  context: BlockRenderContext,
  key: string,
): ReactNode {
  switch (node.type) {
    case "text":
      return (
        <span key={key}>
          {shouldResolveVariables(context)
            ? node.value
            : renderTemplateTokens(node.value, key)}
        </span>
      );
    case "break":
      return <br key={key} />;
    case "bold":
      return (
        <strong key={key} className="font-semibold text-zinc-200">
          {renderNodes(node.children, context, key)}
        </strong>
      );
    case "italic":
      return (
        <em key={key} className="italic">
          {renderNodes(node.children, context, key)}
        </em>
      );
    case "strike":
      return (
        <s key={key} className="text-zinc-400 line-through">
          {renderNodes(node.children, context, key)}
        </s>
      );
    case "code":
      return (
        <code
          key={key}
          className="rounded bg-zinc-800 px-1 py-px font-mono text-[0.85em] text-zinc-200"
        >
          {node.value}
        </code>
      );
    case "link": {
      const href = safeHref(
        shouldResolveVariables(context)
          ? node.href
          : renderTemplateString(node.href, context),
      );
      const children = renderNodes(node.children, context, key);
      const className =
        "text-sky-400 underline decoration-sky-400/40 underline-offset-2 transition-colors hover:text-sky-300";
      if (!href || context.mode === "builder") {
        return (
          <span key={key} className={className}>
            {children}
          </span>
        );
      }
      if (href.startsWith("/") && !href.startsWith("//")) {
        return (
          <Link key={key} href={href} className={className}>
            {children}
          </Link>
        );
      }
      return (
        <a
          key={key}
          href={href}
          className={className}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    }
  }
}
