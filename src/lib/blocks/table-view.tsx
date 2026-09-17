"use client";

import type { MouseEvent, PointerEvent } from "react";
import type { BlockRenderContext } from "./types";
import { InlineEditableText } from "./inline-edit";
import { addColumn, addRow, cellFieldId, normalizeTable, removeColumn, removeRow } from "./table";
import { TemplateText } from "@/lib/variables/template-text";

const addButtonClass =
  "inline-flex size-7 items-center justify-center rounded-md text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200";
const addRowButtonClass =
  "rounded-md px-1 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200";
const removeButtonClass =
  "inline-flex size-5 items-center justify-center rounded text-xs text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-zinc-200 group-hover/cell:opacity-100 group-hover/row:opacity-100";

function stopPointer(event: PointerEvent | MouseEvent) {
  event.stopPropagation();
}

export function TableView({
  props,
  context,
}: {
  props: Record<string, unknown>;
  context: BlockRenderContext;
}) {
  const parsed = normalizeTable(props);
  const header = parsed[0] ?? [""];
  const body = parsed.slice(1);
  const blockId = String(props._blockId ?? "");
  const canEdit = context.mode === "builder" && Boolean(blockId) && Boolean(context.onUpdateBlockProps);
  const canRemoveColumn = header.length > 1;
  const canRemoveRow = parsed.length > 1;

  function patch(next: Record<string, unknown>) {
    context.onUpdateBlockProps?.(blockId, next);
  }

  return (
    <div
      className={`overflow-x-auto rounded-xl border border-zinc-800 ${canEdit ? "pr-3" : ""}`}
    >
      <table className="w-full min-w-64 text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400">
          <tr>
            {header.map((cell, col) => (
              <th key={col} className="group/cell relative min-w-[5rem] px-3 py-2 font-medium">
                {canEdit && canRemoveColumn ? (
                  <button
                    type="button"
                    className={`${removeButtonClass} absolute right-1 top-1`}
                    aria-label={`Remove column ${col + 1}`}
                    onPointerDown={stopPointer}
                    onClick={(event) => {
                      stopPointer(event);
                      patch(removeColumn(props, col));
                    }}
                  >
                    ×
                  </button>
                ) : null}
                {canEdit ? (
                  <InlineEditableText
                    blockId={blockId}
                    fieldId={cellFieldId(0, col)}
                    value={cell}
                    className="block min-h-5 w-full"
                    context={context}
                  />
                ) : (
                  <TemplateText value={cell} context={context} />
                )}
              </th>
            ))}
            {canEdit ? (
              <th className="w-9 p-1 font-normal">
                <button
                  type="button"
                  className={addButtonClass}
                  aria-label="Add column"
                  onPointerDown={stopPointer}
                  onClick={(event) => {
                    stopPointer(event);
                    patch(addColumn(props));
                  }}
                >
                  +
                </button>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="group/row border-b border-zinc-800">
              {row.map((cell, col) => (
                <td key={col} className="min-w-[5rem] px-3 py-2 text-zinc-300">
                  {canEdit ? (
                    <InlineEditableText
                      blockId={blockId}
                      fieldId={cellFieldId(rowIndex + 1, col)}
                      value={cell}
                      className="block min-h-5 w-full"
                      context={context}
                    />
                  ) : (
                    <TemplateText value={cell} context={context} />
                  )}
                </td>
              ))}
              {canEdit ? (
                <td className="w-9 p-1">
                  {canRemoveRow ? (
                    <button
                      type="button"
                      className={removeButtonClass}
                      aria-label={`Remove row ${rowIndex + 1}`}
                      onPointerDown={stopPointer}
                      onClick={(event) => {
                        stopPointer(event);
                        patch(removeRow(props, rowIndex + 1));
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {canEdit ? (
        <div className="border-t border-zinc-800 px-3 py-2">
          <button
            type="button"
            className={addRowButtonClass}
            aria-label="Add row"
            onPointerDown={stopPointer}
            onClick={(event) => {
              stopPointer(event);
              patch(addRow(props));
            }}
          >
            + Add row
          </button>
        </div>
      ) : null}
    </div>
  );
}
