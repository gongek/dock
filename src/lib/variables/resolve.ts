import type { ModerationCaseRowPayload } from "@/lib/meridian/types";

export type {
  BotTemplateContext,
  DiscordVisitorContext,
  TemplateContext,
} from "./context-types";

import type {
  BotTemplateContext,
  DiscordVisitorContext,
  TemplateContext,
} from "./context-types";
import { evaluateTemplateExpression, isSimplePathExpression } from "./expression";
import { findTemplateVariableSpans } from "./format";
import { formatTemplateValue, readTemplatePath } from "./path";

export { formatTemplateValue, readTemplatePath };

export function resolveTemplate(template: string, context: TemplateContext): string {
  const spans = findTemplateVariableSpans(template);
  if (spans.length === 0) return template;

  let result = template;
  for (let index = spans.length - 1; index >= 0; index -= 1) {
    const span = spans[index]!;
    let value: string;
    if (isSimplePathExpression(span.inner)) {
      value = formatTemplateValue(readTemplatePath(context, span.inner.trim()));
    } else {
      value = formatTemplateValue(evaluateTemplateExpression(span.inner, context));
    }
    result = result.slice(0, span.start) + value + result.slice(span.end);
  }
  return result;
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
  const displayName = global_name || username;
  return {
    id: input.id,
    username,
    displayName,
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
