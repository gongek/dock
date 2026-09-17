"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type MutableRefObject,
} from "react";
import type { BlockRenderContext } from "./types";
import { htmlToMarkdown, normalizeHref, parseRichText, richTextToHtml } from "./rich-text";
import { RichTextView } from "./rich-text-view";
import { TemplateText } from "@/lib/variables/template-text";
import {
  normalizeCaretAnchors,
  placeCaretAfterChip,
  plainTextToEditableHtml,
  readTemplateVariablesFromEditable,
  syncEditableVariableDecorations,
  tryBackspaceThroughChip,
} from "@/lib/variables/template-variable-html";

function readPlainEditableValue(element: HTMLElement): string {
  return readTemplateVariablesFromEditable(element).replace(/\u00a0/g, " ");
}

type MarkState = {
  bold: boolean;
  italic: boolean;
  strike: boolean;
};

function getCaretRangeFromPoint(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (px: number, py: number) => Range | null;
    caretPositionFromPoint?: (
      px: number,
      py: number,
    ) => { offsetNode: Node; offset: number } | null;
  };
  if (doc.caretRangeFromPoint) {
    return doc.caretRangeFromPoint(x, y);
  }
  const position = doc.caretPositionFromPoint?.(x, y);
  if (!position) return null;
  const range = document.createRange();
  range.setStart(position.offsetNode, position.offset);
  range.collapse(true);
  return range;
}

function captureCaretOffsetFromPointer(
  element: HTMLElement,
  x: number,
  y: number,
): number | null {
  const caret = getCaretRangeFromPoint(x, y);
  if (!caret || !element.contains(caret.startContainer)) return null;
  const pre = document.createRange();
  pre.selectNodeContents(element);
  pre.setEnd(caret.startContainer, caret.startOffset);
  return pre.toString().length;
}

function applyCaretPreview(element: HTMLElement, x: number, y: number) {
  const caret = getCaretRangeFromPoint(x, y);
  if (!caret || !element.contains(caret.startContainer)) return;
  caret.collapse(true);
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(caret);
}

function resolveTextOffset(
  root: HTMLElement,
  offset: number,
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      return { node: node as Text, offset: remaining };
    }
    remaining -= length;
    node = walker.nextNode();
  }
  return null;
}

function getSelectionOffsets(root: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const toOffset = (container: Node, offset: number) => {
    const probe = document.createRange();
    probe.selectNodeContents(root);
    probe.setEnd(container, offset);
    return probe.toString().length;
  };

  return {
    start: toOffset(range.startContainer, range.startOffset),
    end: toOffset(range.endContainer, range.endOffset),
  };
}

function setSelectionOffsets(root: HTMLElement, start: number, end: number) {
  const startPos = resolveTextOffset(root, start);
  const endPos = resolveTextOffset(root, end);
  if (!startPos || !endPos) return;
  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function setCaretAtCharacterOffset(root: HTMLElement, offset: number) {
  const position = resolveTextOffset(root, offset);
  if (!position) {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return;
  }

  const range = document.createRange();
  range.setStart(position.node, position.offset);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function openInlineEditIfSelected(
  event: MouseEvent,
  context: BlockRenderContext,
  blockId: string,
  fieldId: string,
  pendingCaretOffsetRef: MutableRefObject<number | null>,
) {
  if (context.mode !== "builder" || context.selectedBlockId !== blockId) return;
  event.stopPropagation();
  const offset = captureCaretOffsetFromPointer(
    event.currentTarget as HTMLElement,
    event.clientX,
    event.clientY,
  );
  if (offset !== null) pendingCaretOffsetRef.current = offset;
  context.onStartInlineEdit?.(blockId, fieldId);
}

export function InlineEditableText({
  blockId,
  fieldId,
  value,
  className,
  style,
  tag: Tag = "span",
  multiline = false,
  rich = false,
  context,
}: {
  blockId: string;
  fieldId: string;
  value: string;
  className?: string;
  style?: CSSProperties;
  tag?: "span" | "p" | "h1" | "h2" | "h3";
  multiline?: boolean;
  rich?: boolean;
  context: BlockRenderContext;
}) {
  const ref = useRef<HTMLElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [marks, setMarks] = useState<MarkState>({
    bold: false,
    italic: false,
    strike: false,
  });
  const isEditing =
    context.mode === "builder" &&
    context.editingBlockId === blockId &&
    context.editingFieldId === fieldId;
  const editKey = isEditing ? `${blockId}:${fieldId}` : null;
  const activeEditKeyRef = useRef<string | null>(null);
  const pendingCaretOffsetRef = useRef<number | null>(null);
  const isSelectedForEdit =
    context.mode === "builder" &&
    context.selectedBlockId === blockId &&
    !isEditing;

  useEffect(() => {
    if (!isSelectedForEdit) {
      pendingCaretOffsetRef.current = null;
      if (!isEditing) window.getSelection()?.removeAllRanges();
    }
  }, [isSelectedForEdit, isEditing]);

  useLayoutEffect(() => {
    if (!isEditing || !ref.current || !editKey) {
      activeEditKeyRef.current = null;
      return;
    }
    if (activeEditKeyRef.current === editKey) return;
    activeEditKeyRef.current = editKey;

    const html = rich
      ? richTextToHtml(parseRichText(value)) || ""
      : plainTextToEditableHtml(value);
    ref.current.innerHTML = html;
    ref.current.focus();
    const pendingOffset = pendingCaretOffsetRef.current;
    pendingCaretOffsetRef.current = null;
    if (pendingOffset !== null) {
      setCaretAtCharacterOffset(ref.current, pendingOffset);
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(ref.current);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [isEditing, editKey, rich, value, blockId, fieldId]);

  function handleSelectedTextPointerMove(event: MouseEvent<HTMLElement>) {
    if (!isSelectedForEdit) return;
    const offset = captureCaretOffsetFromPointer(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    if (offset === null) return;
    pendingCaretOffsetRef.current = offset;
    applyCaretPreview(event.currentTarget, event.clientX, event.clientY);
  }

  function handleSelectedTextPointerLeave() {
    if (!isSelectedForEdit) return;
    pendingCaretOffsetRef.current = null;
    window.getSelection()?.removeAllRanges();
  }

  useEffect(() => {
    if (!isEditing || !rich) return;
    const syncMarks = () => {
      try {
        setMarks({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          strike: document.queryCommandState("strikeThrough"),
        });
      } catch {
        // queryCommandState is not available in every browser context.
      }
    };
    document.addEventListener("selectionchange", syncMarks);
    syncMarks();
    return () => document.removeEventListener("selectionchange", syncMarks);
  }, [isEditing, rich]);

  const displayClassName = `${className ?? ""} outline-none ${
    !rich && (multiline || isEditing) ? "whitespace-pre-wrap" : ""
  } ${isSelectedForEdit ? "select-text" : ""} ${
    isEditing
      ? "builder-inline-edit-focus"
      : context.mode === "builder"
        ? context.selectedBlockId === blockId
          ? "cursor-text"
          : "cursor-default"
        : "cursor-text"
  }`;
  const hostKey = `${blockId}:${fieldId}:${isEditing ? "edit" : "view"}`;

  function commit(next = readCurrentValue()) {
    context.onInlineEdit?.(blockId, fieldId, next);
    setLinkOpen(false);
  }

  function readCurrentValue() {
    const element = ref.current;
    if (!element) return value;
    normalizeCaretAnchors(element);
    return rich ? htmlToMarkdown(element) : readPlainEditableValue(element);
  }

  function syncVariableDecorations() {
    const element = ref.current;
    if (!element || !isEditing) return;
    normalizeCaretAnchors(element);
    const nextValue = readCurrentValue();
    const html = rich
      ? richTextToHtml(parseRichText(nextValue)) || ""
      : plainTextToEditableHtml(nextValue);
    syncEditableVariableDecorations(element, html);
  }

  function rememberSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRange.current = selection.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const range = savedRange.current;
    if (!range || !ref.current) return;
    ref.current.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function syncMarksState() {
    requestAnimationFrame(() => {
      try {
        setMarks({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          strike: document.queryCommandState("strikeThrough"),
        });
      } catch {
        // queryCommandState is not available in every browser context.
      }
    });
  }

  function runCommand(command: string, commandValue?: string | (() => string)) {
    restoreSelection();
    ref.current?.focus();
    const root = ref.current;
    if (!root) return;

    const offsets = getSelectionOffsets(root);
    const value = typeof commandValue === "function" ? commandValue() : commandValue;

    document.execCommand(command, false, value);

    if (offsets) {
      setSelectionOffsets(root, offsets.start, offsets.end);
    }
    rememberSelection();
    syncMarksState();
  }

  function applyLink() {
    const href = normalizeHref(linkValue);
    if (!href) {
      runCommand("unlink");
    } else {
      runCommand("createLink", href);
    }
    setLinkOpen(false);
    setLinkValue("");
    ref.current?.focus();
  }

  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    if (!isEditing) return;
    const next = event.relatedTarget as Node | null;
    if (toolbarRef.current?.contains(next)) return;
    commit();
  }

  if (context.mode !== "builder") {
    if (rich) {
      return (
        <RichTextView
          value={value}
          className={className}
          style={style}
          tag={Tag}
          context={context}
        />
      );
    }
    return (
      <Tag
        className={`${className ?? ""} ${multiline ? "whitespace-pre-wrap" : ""}`.trim()}
        style={style}
      >
        <TemplateText value={value} context={context} />
      </Tag>
    );
  }

  if (!rich && !isEditing) {
    return (
      <Tag
        key={hostKey}
        className={displayClassName}
        style={style}
        onMouseMove={handleSelectedTextPointerMove}
        onMouseLeave={handleSelectedTextPointerLeave}
        onClick={(event) =>
          openInlineEditIfSelected(event, context, blockId, fieldId, pendingCaretOffsetRef)
        }
      >
        <TemplateText value={value} context={context} />
      </Tag>
    );
  }

  if (rich && !isEditing) {
    return (
      <RichTextView
        key={hostKey}
        value={value}
        className={`${className ?? ""} ${
          isSelectedForEdit ? "select-text" : ""
        } ${
          context.mode === "builder"
            ? context.selectedBlockId === blockId
              ? "cursor-text"
              : "cursor-default"
            : "cursor-text"
        }`}
        style={style}
        tag={Tag}
        context={context}
        onMouseMove={handleSelectedTextPointerMove}
        onMouseLeave={handleSelectedTextPointerLeave}
        onClick={(event) =>
          openInlineEditIfSelected(event, context, blockId, fieldId, pendingCaretOffsetRef)
        }
      />
    );
  }

  const editor = (
    <Tag
      key={hostKey}
      ref={ref as React.RefObject<HTMLHeadingElement & HTMLParagraphElement & HTMLSpanElement>}
      className={displayClassName}
      style={style}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        context.onStartInlineEdit?.(blockId, fieldId);
      }}
      onBlur={handleBlur}
      onCopy={(event) => {
        if (!isEditing || rich) return;
        event.preventDefault();
        event.clipboardData?.setData("text/plain", readCurrentValue());
      }}
      onInput={() => {
        syncVariableDecorations();
      }}
      onKeyDown={(e) => {
        if (e.key === "Backspace" && ref.current && tryBackspaceThroughChip(ref.current)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if ((e.metaKey || e.ctrlKey) && rich) {
          const key = e.key.toLowerCase();
          if (key === "b") {
            e.preventDefault();
            runCommand("bold");
          } else if (key === "i") {
            e.preventDefault();
            runCommand("italic");
          } else             if (key === "k") {
              e.preventDefault();
              rememberSelection();
              const existing = selectedLinkHref();
              setLinkValue(existing);
              setLinkOpen(true);
            }
        }
        if (e.key === "Enter") {
          if (!multiline) {
            e.preventDefault();
            (e.currentTarget as HTMLElement).blur();
          } else if (!rich) {
            e.preventDefault();
            document.execCommand("insertText", false, "\n");
          }
        }
        if (e.key === "Escape") {
          e.preventDefault();
          if (ref.current) {
            if (rich) {
              ref.current.innerHTML = richTextToHtml(parseRichText(value)) || "";
            } else {
              ref.current.innerHTML = plainTextToEditableHtml(value);
            }
          }
          setLinkOpen(false);
          (e.currentTarget as HTMLElement).blur();
        }
        e.stopPropagation();
      }}
      onClick={(event) => {
        const chip = (event.target as HTMLElement).closest("[data-template-var]");
        if (chip instanceof HTMLElement && ref.current?.contains(chip)) {
          event.preventDefault();
          placeCaretAfterChip(chip);
        }
      }}
    />
  );

  if (!rich) return editor;

  return (
    <div className="relative">
      {isEditing ? (
        <div
          ref={toolbarRef}
          className="absolute bottom-full left-0 z-20 mb-1 flex flex-wrap items-center gap-1 rounded-lg border border-white/[0.1] bg-zinc-950 p-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          onPointerDown={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("input")) return;
            event.preventDefault();
            rememberSelection();
          }}
        >
          <FormatButton
            label="Bold"
            icon="bx-bold"
            pressed={marks.bold}
            onClick={() => runCommand("bold")}
          />
          <FormatButton
            label="Italic"
            icon="bx-italic"
            pressed={marks.italic}
            onClick={() => runCommand("italic")}
          />
          <FormatButton
            label="Strikethrough"
            icon="bx-strikethrough"
            pressed={marks.strike}
            onClick={() => runCommand("strikeThrough")}
          />
          <FormatButton
            label="Code"
            icon="bx-code"
            onClick={() => runCommand("insertHTML", wrapSelectionWithCode)}
          />
          <FormatButton
            label="Link"
            icon="bx-link"
            pressed={linkOpen}
            onClick={() => {
              rememberSelection();
              const existing = selectedLinkHref();
              setLinkValue(existing);
              setLinkOpen((open) => !open);
            }}
          />
          {linkOpen ? (
            <form
              className="flex items-center gap-1 pl-1"
              onSubmit={(event) => {
                event.preventDefault();
                applyLink();
              }}
            >
              <input
                value={linkValue}
                onChange={(event) => setLinkValue(event.target.value)}
                placeholder="https://"
                aria-label="Link URL"
                className="site-builder-field site-builder-field-compact h-7 w-44 min-w-0"
              />
              <button
                type="submit"
                className="rounded-md px-1.5 text-[11px] text-zinc-200 hover:bg-white/[0.06]"
              >
                Apply
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
      {editor}
    </div>
  );
}

function FormatButton({
  label,
  icon,
  pressed,
  onClick,
}: {
  label: string;
  icon: string;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex size-7 items-center justify-center rounded-md ${
        pressed
          ? "bg-white/[0.08] text-zinc-100"
          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
      }`}
    >
      <i className={`bx ${icon} text-sm`} aria-hidden />
    </button>
  );
}

function selectedLinkHref(): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "";
  const node = selection.anchorNode;
  const element =
    node instanceof HTMLElement ? node : node?.parentElement;
  const link = element?.closest("a");
  return link?.getAttribute("href") ?? "";
}

function wrapSelectionWithCode(): string {
  const selection = window.getSelection();
  const text = selection?.toString() || "code";
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<code>${escaped}</code>`;
}
