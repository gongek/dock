import type { ModerationCaseRowPayload } from "@/lib/meridian/types";

export type DiscordVisitorContext = {
  id: string;
  username: string;
  displayName: string;
  global_name: string;
  avatar: string;
  mention: string;
};

export type BotTemplateContext = {
  id: string;
  name: string;
};

export type TemplateContext = {
  site?: {
    title?: string;
    slug?: string;
  };
  page?: {
    title?: string;
    slug?: string;
  };
  bot?: BotTemplateContext;
  case?: Partial<ModerationCaseRowPayload> & {
    slug?: string;
  };
  discord?: DiscordVisitorContext;
  vars?: Record<string, string | number | undefined>;
};

import { TEMPLATE_VAR_RE } from "./format";

function readPath(context: TemplateContext, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = context;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  if (path.startsWith("case.") && current === undefined && context.case) {
    const caseKey = path.slice("case.".length);
    if (caseKey === "slug") return context.case.publicSlug ?? context.case.slug;
    return (context.case as Record<string, unknown>)[caseKey];
  }
  return current;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.displayName === "string" && record.displayName) {
      return record.displayName;
    }
    if (typeof record.name === "string" && record.name) return record.name;
    if (typeof record.username === "string") return record.username;
    return "";
  }
  return String(value);
}

export function resolveTemplate(template: string, context: TemplateContext): string {
  return template.replace(
    TEMPLATE_VAR_RE,
    (_match, doublePath: string | undefined, singlePath: string | undefined) => {
      const path = doublePath ?? singlePath;
      if (!path) return "";
      return formatValue(readPath(context, path));
    },
  );
}

export function buildBotTemplateContext(input: {
  id?: string | null;
  name?: string | null;
} | null | undefined): BotTemplateContext | undefined {
  const id = input?.id?.trim() ?? "";
  if (!id) return undefined;
  return {
    id,
    name: input?.name?.trim() ?? "",
  };
}

export function buildDiscordTemplateContext(input: {
  id: string;
  username?: string | null;
  globalName?: string | null;
  avatarUrl?: string | null;
} | null | undefined): DiscordVisitorContext | undefined {
  if (!input?.id) return undefined;
  const username = input.username?.trim() ?? "";
  const global_name = input.globalName?.trim() ?? "";
  return {
    id: input.id,
    username,
    displayName: global_name || username,
    global_name,
    avatar: input.avatarUrl?.trim() ?? "",
    mention: `<@${input.id}>`,
  };
}

export function buildCaseTemplateContext(
  caseRow: Partial<ModerationCaseRowPayload> & { publicSlug?: string },
): TemplateContext {
  return {
    case: {
      ...caseRow,
      slug: caseRow.publicSlug,
      caseId: caseRow.caseId,
      caseNumber: caseRow.caseNumber,
      reason: caseRow.reason,
      type: caseRow.type,
      customType: caseRow.customType,
      targetUserId: caseRow.targetUserId,
      issuerUserId: caseRow.issuerUserId,
      evidenceUrl: caseRow.evidenceUrl,
      publicSlug: caseRow.publicSlug,
    },
  };
}
