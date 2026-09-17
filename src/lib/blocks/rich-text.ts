import { decorateTemplateVariablesToHtml } from "@/lib/variables/template-variable-html";

export type RichNode =
  | { type: "text"; value: string }
  | { type: "break" }
  | { type: "bold"; children: RichNode[] }
  | { type: "italic"; children: RichNode[] }
  | { type: "strike"; children: RichNode[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: RichNode[] };

export function parseRichText(input: string): RichNode[] {
  return parseRange(input, 0, input.length).nodes;
}

export function richTextToHtml(nodes: RichNode[]): string {
  return nodes.map(nodeToHtml).join("");
}

export function htmlToMarkdown(root: HTMLElement): string {
  return collapseNewlines(walkHtml(root)).replace(/\n+$/g, "");
}

export function safeHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return "";
  }
  return trimmed;
}

export function normalizeHref(raw: string): string {
  const href = raw.trim();
  if (!href) return "";
  if (
    href.startsWith("{") ||
    href.startsWith("/") ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.includes("://")
  ) {
    return href;
  }
  return `https://${href}`;
}

function parseRange(
  src: string,
  start: number,
  end: number,
): { nodes: RichNode[]; consumed: number } {
  const nodes: RichNode[] = [];
  let i = start;
  let textStart = i;

  const flushText = () => {
    if (textStart >= i) return;
    pushText(nodes, src.slice(textStart, i));
    textStart = i;
  };

  while (i < end) {
    if (src[i] === "\\" && i + 1 < end) {
      flushText();
      nodes.push({ type: "text", value: src[i + 1] ?? "" });
      i += 2;
      textStart = i;
      continue;
    }

    if (src.startsWith("***", i)) {
      const close = findClose(src, i + 3, end, "***");
      if (close !== -1) {
        flushText();
        nodes.push({
          type: "bold",
          children: [
            { type: "italic", children: parseRange(src, i + 3, close).nodes },
          ],
        });
        i = close + 3;
        textStart = i;
        continue;
      }
    }

    if (src.startsWith("**", i)) {
      const close = findClose(src, i + 2, end, "**");
      if (close !== -1) {
        flushText();
        nodes.push({ type: "bold", children: parseRange(src, i + 2, close).nodes });
        i = close + 2;
        textStart = i;
        continue;
      }
    }

    if (src.startsWith("~~", i)) {
      const close = findClose(src, i + 2, end, "~~");
      if (close !== -1) {
        flushText();
        nodes.push({ type: "strike", children: parseRange(src, i + 2, close).nodes });
        i = close + 2;
        textStart = i;
        continue;
      }
    }

    if (src[i] === "`") {
      const close = findClose(src, i + 1, end, "`");
      if (close !== -1) {
        flushText();
        nodes.push({ type: "code", value: src.slice(i + 1, close) });
        i = close + 1;
        textStart = i;
        continue;
      }
    }

    if (src[i] === "*" ) {
      const close = findClose(src, i + 1, end, "*");
      if (close !== -1) {
        flushText();
        nodes.push({ type: "italic", children: parseRange(src, i + 1, close).nodes });
        i = close + 1;
        textStart = i;
        continue;
      }
    }

    if (src[i] === "[") {
      const labelEnd = findClose(src, i + 1, end, "]");
      if (labelEnd !== -1 && src[labelEnd + 1] === "(") {
        const hrefEnd = findHrefClose(src, labelEnd + 2, end);
        if (hrefEnd !== -1) {
          flushText();
          nodes.push({
            type: "link",
            href: src.slice(labelEnd + 2, hrefEnd).trim(),
            children: parseRange(src, i + 1, labelEnd).nodes,
          });
          i = hrefEnd + 1;
          textStart = i;
          continue;
        }
      }
    }

    i += 1;
  }

  flushText();
  return { nodes, consumed: end - start };
}

function findClose(src: string, from: number, end: number, marker: string): number {
  let i = from;
  while (i < end) {
    if (src[i] === "\\" && i + 1 < end) {
      i += 2;
      continue;
    }
    if (src.startsWith(marker, i)) {
      if (marker === "*" && src.startsWith("**", i)) {
        i += 2;
        continue;
      }
      return i;
    }
    i += 1;
  }
  return -1;
}

function findHrefClose(src: string, from: number, end: number): number {
  let i = from;
  while (i < end) {
    if (src[i] === ")") return i;
    if (src[i] === " " || src[i] === "\n") return -1;
    i += 1;
  }
  return -1;
}

function pushText(nodes: RichNode[], value: string) {
  if (!value) return;
  const parts = value.split("\n");
  parts.forEach((part, index) => {
    if (part) nodes.push({ type: "text", value: part });
    if (index < parts.length - 1) nodes.push({ type: "break" });
  });
}

function nodeToHtml(node: RichNode): string {
  switch (node.type) {
    case "text":
      return decorateTemplateVariablesToHtml(node.value);
    case "break":
      return "<br>";
    case "bold":
      return `<strong>${richTextToHtml(node.children)}</strong>`;
    case "italic":
      return `<em>${richTextToHtml(node.children)}</em>`;
    case "strike":
      return `<s>${richTextToHtml(node.children)}</s>`;
    case "code":
      return `<code>${escapeHtml(node.value)}</code>`;
    case "link": {
      const href = escapeAttr(safeHref(node.href) || "#");
      return `<a href="${href}">${richTextToHtml(node.children)}</a>`;
    }
  }
}

function walkHtml(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeMarkdown((node.textContent ?? "").replace(/\u200B/g, ""));
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  if (el.dataset.templateVar) {
    return el.dataset.templateVar;
  }
  if (el.dataset.templateCaretAnchor) {
    return (el.textContent ?? "").replace(/\u200B/g, "");
  }
  const tag = el.tagName.toLowerCase();
  if (tag === "br") return "\n";
  const inner = Array.from(el.childNodes).map(walkHtml).join("");
  if (tag === "strong" || tag === "b") return wrapMark(inner, "**");
  if (tag === "em" || tag === "i") return wrapMark(inner, "*");
  if (tag === "s" || tag === "strike" || tag === "del") return wrapMark(inner, "~~");
  if (tag === "u") return wrapMark(inner, "*");
  if (tag === "code") return inner ? `\`${inner.replace(/`/g, "")}\`` : "";
  if (tag === "a") {
    const href = el.getAttribute("href") ?? "";
    return `[${inner}](${href})`;
  }
  let marked = inner;
  const weight = el.style.fontWeight;
  if (weight === "bold" || Number(weight) >= 600) marked = wrapMark(marked, "**");
  if (el.style.fontStyle === "italic") marked = wrapMark(marked, "*");
  if (el.style.textDecoration.includes("line-through")) marked = wrapMark(marked, "~~");
  if (tag === "div" || tag === "p" || tag === "li") {
    return `${marked}\n`;
  }
  return marked;
}

function wrapMark(inner: string, marker: string): string {
  return inner ? `${marker}${inner}${marker}` : "";
}

function collapseNewlines(value: string): string {
  return value.replace(/\n{3,}/g, "\n\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*[\]~])/g, "\\$1");
}
