import { TEMPLATE_VAR_RE } from "./format";

export const TEMPLATE_VAR_CHIP_CLASSES =
  "template-var-chip mx-0.5 inline-flex max-w-full items-center gap-1 rounded-md border border-zinc-600/40 bg-zinc-800/70 px-1.5 py-0.5 align-baseline text-[0.85em] leading-none text-zinc-300";

const TEMPLATE_VAR_ICON_CLASSES =
  "inline-flex size-4 shrink-0 items-center justify-center rounded bg-sky-500/15 text-sky-400";

const TEMPLATE_VAR_LABEL_CLASSES = "truncate font-medium";

const CARET_ANCHOR_CHAR = "\u200B";

const VARIABLE_ICON_SVG =
  '<svg class="size-3" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5.25 2.75C3.25 4.25 3.25 6.5 3.25 8s0 3.75 2 5.25M10.75 2.75C12.75 4.25 12.75 6.5 12.75 8s0 3.75-2 5.25" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function templateVariableCaretAnchorHtml(): string {
  return `<span data-template-caret-anchor="true">${CARET_ANCHOR_CHAR}</span>`;
}

export function templateVariableChipHtml(raw: string): string {
  return `${`<span data-template-var="${escapeAttr(raw)}" contenteditable="false" class="${TEMPLATE_VAR_CHIP_CLASSES}"><span class="${TEMPLATE_VAR_ICON_CLASSES}">${VARIABLE_ICON_SVG}</span><span class="${TEMPLATE_VAR_LABEL_CLASSES}">${escapeHtml(raw)}</span></span>`}${templateVariableCaretAnchorHtml()}`;
}

export function decorateTemplateVariablesToHtml(text: string): string {
  const tokens: Array<{ type: "text"; content: string } | { type: "var"; raw: string }> = [];
  let lastIndex = 0;
  const re = new RegExp(TEMPLATE_VAR_RE.source, "g");
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ type: "text", content: text.slice(lastIndex, index) });
    }
    tokens.push({ type: "var", raw: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", content: text.slice(lastIndex) });
  }
  if (tokens.length === 0) {
    return escapeHtml(text);
  }
  return tokens
    .map((token) =>
      token.type === "text"
        ? escapeHtml(token.content)
        : templateVariableChipHtml(token.raw),
    )
    .join("");
}

export function plainTextToEditableHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => decorateTemplateVariablesToHtml(line))
    .join("<br>");
}

function isCaretAnchorElement(element: HTMLElement): boolean {
  return element.dataset.templateCaretAnchor === "true";
}

function storageLength(text: string): number {
  return text.replaceAll(CARET_ANCHOR_CHAR, "").length;
}

function storageOffsetToDomOffset(text: string, storageOffset: number): number {
  let storage = 0;
  let dom = 0;
  for (const char of text) {
    if (char === CARET_ANCHOR_CHAR) {
      dom += 1;
      continue;
    }
    if (storage >= storageOffset) return dom;
    storage += 1;
    dom += 1;
  }
  return dom;
}

function getChipFromNode(node: Node | null): HTMLElement | null {
  if (!node) return null;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;
  const chip = element?.closest("[data-template-var]");
  return chip instanceof HTMLElement ? chip : null;
}

export function readTemplateVariablesFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replaceAll(CARET_ANCHOR_CHAR, "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;
  const templateVar = element.dataset.templateVar;
  if (templateVar) {
    return templateVar;
  }
  if (isCaretAnchorElement(element)) {
    return (element.textContent ?? "").replaceAll(CARET_ANCHOR_CHAR, "");
  }
  if (element.tagName === "BR") {
    return "\n";
  }

  return Array.from(element.childNodes).map(readTemplateVariablesFromNode).join("");
}

export function readTemplateVariablesFromEditable(root: HTMLElement): string {
  return readTemplateVariablesFromNode(root).replace(/\n+$/g, "");
}

export function getEditableStorageOffset(root: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return readTemplateVariablesFromEditable(root).length;
  }

  const range = selection.getRangeAt(0);
  let offset = 0;
  let found = false;

  const walk = (node: Node): boolean => {
    if (found) return true;

    if (node === range.endContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        const chip = getChipFromNode(node);
        if (chip?.dataset.templateVar) {
          offset += chip.dataset.templateVar.length;
        } else {
          const beforeCaret = (node.textContent ?? "")
            .slice(0, range.endOffset)
            .replaceAll(CARET_ANCHOR_CHAR, "");
          offset += beforeCaret.length;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.dataset.templateVar) {
          offset += element.dataset.templateVar.length;
        }
      }
      found = true;
      return true;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += storageLength(node.textContent ?? "");
      return false;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.dataset.templateVar) {
        if (element.contains(range.endContainer)) {
          offset += element.dataset.templateVar.length;
          found = true;
          return true;
        }
        offset += element.dataset.templateVar.length;
        return false;
      }
      if (isCaretAnchorElement(element)) {
        const anchorText = (element.textContent ?? "").replaceAll(CARET_ANCHOR_CHAR, "");
        if (element === range.endContainer || element.contains(range.endContainer)) {
          if (
            range.endContainer.nodeType === Node.TEXT_NODE &&
            element.contains(range.endContainer)
          ) {
            const beforeCaret = (range.endContainer.textContent ?? "")
              .slice(0, range.endOffset)
              .replaceAll(CARET_ANCHOR_CHAR, "");
            offset += beforeCaret.length;
          } else {
            offset += anchorText.length;
          }
          found = true;
          return true;
        }
        offset += anchorText.length;
        return false;
      }
      if (element.tagName === "BR") {
        offset += 1;
        return false;
      }
      for (const child of Array.from(element.childNodes)) {
        if (walk(child)) return true;
      }
    }

    return false;
  };

  walk(root);
  if (!found && !root.contains(range.endContainer)) {
    return readTemplateVariablesFromEditable(root).length;
  }
  return offset;
}

function placeCaretInAnchor(anchor: HTMLElement, selection: Selection) {
  const textNode =
    anchor.firstChild?.nodeType === Node.TEXT_NODE
      ? anchor.firstChild
      : anchor.appendChild(document.createTextNode(CARET_ANCHOR_CHAR));
  const range = document.createRange();
  range.setStart(textNode, textNode.textContent?.length ?? 0);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function placeCaretAfterChip(chip: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;

  const next = chip.nextSibling;
  if (next instanceof HTMLElement && isCaretAnchorElement(next)) {
    placeCaretInAnchor(next, selection);
    return;
  }

  const parent = chip.parentNode;
  if (!parent) return;
  const index = Array.from(parent.childNodes).indexOf(chip);
  const range = document.createRange();
  range.setStart(parent, index + 1);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function setEditableStorageOffset(root: HTMLElement, targetOffset: number) {
  const selection = window.getSelection();
  if (!selection) return;

  let offset = 0;
  let placed = false;

  const placeAt = (node: Node, nodeOffset: number) => {
    const range = document.createRange();
    range.setStart(node, nodeOffset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    placed = true;
  };

  const walk = (node: Node): boolean => {
    if (placed) return true;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      const length = storageLength(text);
      if (offset + length >= targetOffset) {
        const domOffset = storageOffsetToDomOffset(text, targetOffset - offset);
        placeAt(node, domOffset);
        return true;
      }
      offset += length;
      return false;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.dataset.templateVar) {
        const length = element.dataset.templateVar.length;
        const chipEnd = offset + length;
        if (targetOffset <= chipEnd) {
          if (targetOffset > offset) {
            placeCaretAfterChip(element);
            placed = true;
          } else {
            const parent = element.parentNode;
            if (parent) {
              const index = Array.from(parent.childNodes).indexOf(element);
              placeAt(parent, index);
            }
          }
          return true;
        }
        offset += length;
        return false;
      }
      if (isCaretAnchorElement(element)) {
        const length = (element.textContent ?? "").replaceAll(CARET_ANCHOR_CHAR, "").length;
        if (offset + length >= targetOffset) {
          const textNode = element.firstChild;
          if (textNode?.nodeType === Node.TEXT_NODE && length > 0) {
            const domOffset =
              CARET_ANCHOR_CHAR.length + Math.max(0, targetOffset - offset);
            placeAt(textNode, Math.min(domOffset, textNode.textContent?.length ?? 0));
          } else {
            placeCaretInAnchor(element, selection);
            placed = true;
          }
          return true;
        }
        offset += length;
        if (targetOffset === offset) {
          placeCaretInAnchor(element, selection);
          placed = true;
          return true;
        }
        return false;
      }
      if (element.tagName === "BR") {
        if (offset + 1 >= targetOffset) {
          const parent = element.parentNode;
          if (parent) {
            const index = Array.from(parent.childNodes).indexOf(element);
            placeAt(parent, index + (targetOffset > offset ? 1 : 0));
          }
          return true;
        }
        offset += 1;
        return false;
      }
      for (const child of Array.from(element.childNodes)) {
        if (walk(child)) return true;
      }
    }

    return false;
  };

  walk(root);

  if (!placed) {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

export function ensureCaretOutsideChips(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const chip = getChipFromNode(selection.getRangeAt(0).startContainer);
  if (chip && root.contains(chip)) {
    placeCaretAfterChip(chip);
  }
}

/** Move typed text out of caret anchors into real text nodes after the chip. */
export function normalizeCaretAnchors(root: HTMLElement) {
  const selection = window.getSelection();
  const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
  let caretNode: Node | null = null;
  let caretOffset = 0;

  for (const anchor of root.querySelectorAll("[data-template-caret-anchor]")) {
    if (!(anchor instanceof HTMLElement)) continue;

    const typed = (anchor.textContent ?? "").replaceAll(CARET_ANCHOR_CHAR, "");
    if (!typed) continue;

    const caretInAnchor =
      activeRange &&
      (anchor === activeRange.startContainer || anchor.contains(activeRange.startContainer));

    let textNode: Text;
    const next = anchor.nextSibling;
    if (next?.nodeType === Node.TEXT_NODE) {
      textNode = next as Text;
      const existing = (textNode.textContent ?? "").replaceAll(CARET_ANCHOR_CHAR, "");
      textNode.textContent = existing + typed;
      caretOffset = caretInAnchor ? existing.length + typed.length : caretOffset;
    } else {
      textNode = document.createTextNode(typed);
      anchor.parentNode?.insertBefore(textNode, anchor.nextSibling);
      caretOffset = typed.length;
    }

    anchor.textContent = CARET_ANCHOR_CHAR;

    if (caretInAnchor) {
      caretNode = textNode;
    }
  }

  if (caretNode && selection) {
    const range = document.createRange();
    range.setStart(caretNode, caretOffset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

export function syncEditableVariableDecorations(
  element: HTMLElement,
  html: string,
) {
  if (element.innerHTML === html) return;
  normalizeCaretAnchors(element);
  const offset = getEditableStorageOffset(element);
  element.innerHTML = html;
  setEditableStorageOffset(element, offset);
  ensureCaretOutsideChips(element);
  requestAnimationFrame(() => ensureCaretOutsideChips(element));
}

function isTemplateVarChip(node: Node | null): HTMLElement | null {
  if (!(node instanceof HTMLElement)) return null;
  return node.dataset.templateVar ? node : null;
}

function findChipBeforeNode(node: Node | null, root: HTMLElement): HTMLElement | null {
  if (!(node instanceof HTMLElement)) return null;
  if (isCaretAnchorElement(node)) {
    return isTemplateVarChip(node.previousSibling);
  }
  const chip = isTemplateVarChip(node);
  return chip && root.contains(chip) ? chip : null;
}

function findChipTargetForBackspace(root: HTMLElement): HTMLElement | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }

  const { startContainer, startOffset } = selection.getRangeAt(0);

  const chipInside = getChipFromNode(startContainer);
  if (chipInside && root.contains(chipInside)) {
    return chipInside;
  }

  const anchorHost =
    startContainer.nodeType === Node.ELEMENT_NODE
      ? (startContainer as HTMLElement)
      : startContainer.parentElement;
  if (anchorHost && isCaretAnchorElement(anchorHost) && root.contains(anchorHost)) {
    const chipBefore = isTemplateVarChip(anchorHost.previousSibling);
    if (chipBefore) return chipBefore;
  }

  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    const previous = startContainer.childNodes[startOffset - 1] ?? null;
    const chipBefore = findChipBeforeNode(previous, root);
    if (chipBefore) return chipBefore;
  }

  if (startContainer.nodeType === Node.TEXT_NODE) {
    const parent = startContainer.parentElement;
    if (parent && isCaretAnchorElement(parent) && root.contains(parent)) {
      const chipBefore = isTemplateVarChip(parent.previousSibling);
      if (chipBefore) return chipBefore;
    }
    if (startOffset === 0) {
      const chipBefore = findChipBeforeNode(startContainer.previousSibling, root);
      if (chipBefore) return chipBefore;
    }
  }

  return null;
}

function removeCaretAnchorAfter(chip: HTMLElement) {
  const next = chip.nextSibling;
  if (next instanceof HTMLElement && isCaretAnchorElement(next)) {
    next.remove();
  }
}

/** Replace a variable chip with its raw text minus one trailing character. */
export function tryBackspaceThroughChip(root: HTMLElement): boolean {
  const chip = findChipTargetForBackspace(root);
  if (!chip) return false;

  const raw = chip.dataset.templateVar;
  if (!raw) return false;

  const partial = raw.slice(0, -1);
  const parent = chip.parentNode;
  if (!parent) return false;

  removeCaretAnchorAfter(chip);
  const textNode = document.createTextNode(partial);
  parent.replaceChild(textNode, chip);

  root.focus();
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.setStart(textNode, partial.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  return true;
}
