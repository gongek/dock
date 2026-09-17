import type { ReactNode } from "react";

import type { TemplateContext } from "@/lib/variables/resolve";

import type { ModerationCaseRowPayload } from "@/lib/meridian/types";



export type BlockType =

  | "heading"

  | "text"

  | "image"

  | "button"

  | "link"

  | "badge"

  | "quote"

  | "callout"

  | "faq"

  | "code"

  | "embed"

  | "nav"

  | "list"

  | "case_collection"

  | "divider"

  | "footer"

  | "section"

  | "columns"

  | "group"

  | "card"

  | "row"

  | "spacer"

  | "stat"

  | "avatar"

  | "icon"

  | "social"

  | "table"

  | "video"

  | "audio"

  | "map"

  | "download"

  | "progress"

  | "countdown"

  | "timeline"

  | "graph";



export type SitePageSummary = {

  slug: string;

  title: string;

  showInNav: boolean;

};



export type BlockRenderContext = TemplateContext & {

  pages?: SitePageSummary[];

  cases?: ModerationCaseRowPayload[];

  caseUrlPattern?: string;

  currentPath?: string;

  mode?: "builder" | "public";

  resolveVariables?: boolean;

  editingBlockId?: string | null;

  editingFieldId?: string | null;

  selectedBlockId?: string | null;

  onInlineEdit?: (blockId: string, fieldId: string, value: string) => void;

  onStartInlineEdit?: (blockId: string, fieldId?: string) => void;

  onUpdateBlockProps?: (blockId: string, props: Record<string, unknown>) => void;

  mediaUrlResolver?: (storageId: string) => string | undefined;

};



export type BlockDefinition<TProps = Record<string, unknown>> = {

  type: BlockType;

  label: string;

  defaultProps: TProps;

  createId: (type: BlockType) => string;

  isContainer?: boolean;

};



export type SiteBlock = {

  blockId: string;

  type: BlockType;

  order: number;

  parentBlockId?: string;

  props: Record<string, unknown>;

};



export type BlockEditorField = (
  | { kind: "text"; id: string; label: string; variable?: boolean }
  | { kind: "datetime"; id: string; label: string }
  | { kind: "number"; id: string; label: string; min?: number; max?: number }
  | { kind: "select"; id: string; label: string; options: { label: string; value: string }[] }
  | { kind: "boolean"; id: string; label: string }
  | { kind: "textarea"; id: string; label: string; variable?: boolean }
  | { kind: "media"; id: string; label: string }
  | { kind: "table"; id: string; label: string; variable?: boolean }
  | { kind: "social-links"; id: string; label: string; variable?: boolean }
  | { kind: "guild"; id: string; label: string }
) & { visibleWhen?: (props: Record<string, unknown>) => boolean };



export type BlockRegistryEntry = {

  definition: BlockDefinition;

  fields: BlockEditorField[];

  render: (

    props: Record<string, unknown>,

    context: BlockRenderContext,

    children?: ReactNode,

  ) => ReactNode;

};



export function createBlockId(type: BlockType): string {

  return `${type}-${Math.random().toString(36).slice(2, 9)}`;

}


