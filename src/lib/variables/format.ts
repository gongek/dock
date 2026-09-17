import {
  extractPathsFromExpression,
  findTemplateExpressionClose,
  isValidTemplateExpression,
} from "./expression";

export type TemplateVariableSpan = {
  raw: string;
  inner: string;
  start: number;
  end: number;
};

/** @deprecated Use findTemplateVariableSpans instead. */
export const TEMPLATE_VAR_RE =
  /\{\{([a-zA-Z0-9_.[\]-]+)\}\}|\{([a-zA-Z0-9_.[\]-]+)\}/g;

export function findTemplateVariableSpans(template: string): TemplateVariableSpan[] {
  const spans: TemplateVariableSpan[] = [];
  let index = 0;

  while (index < template.length) {
    if (template[index] === "{" && template[index + 1] === "{") {
      const innerStart = index + 2;
      const closeIndex = findTemplateExpressionClose(template, innerStart, true);
      if (closeIndex !== null) {
        const inner = template.slice(innerStart, closeIndex).trim();
        if (inner && isValidTemplateExpression(inner)) {
          const end = closeIndex + 2;
          spans.push({
            raw: template.slice(index, end),
            inner,
            start: index,
            end,
          });
          index = end;
          continue;
        }
      }
      index += 1;
      continue;
    }

    if (template[index] === "{") {
      const innerStart = index + 1;
      const closeIndex = findTemplateExpressionClose(template, innerStart, false);
      if (closeIndex !== null) {
        const inner = template.slice(innerStart, closeIndex).trim();
        if (inner && isValidTemplateExpression(inner)) {
          const end = closeIndex + 1;
          spans.push({
            raw: template.slice(index, end),
            inner,
            start: index,
            end,
          });
          index = end;
          continue;
        }
      }
      index += 1;
      continue;
    }

    index += 1;
  }

  return spans;
}

export function variableDisplayPath(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) {
    return trimmed.slice(2, -2).trim();
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed.slice(1, -1).trim();
  }
  return raw;
}

export function storageToDisplay(template: string): string {
  return template;
}

export function displayToStorage(template: string): string {
  return findTemplateVariableSpans(template)
    .reduceRight((text, span) => {
      if (!span.raw.startsWith("{{")) return text;
      const replacement = `{${span.inner}}`;
      return text.slice(0, span.start) + replacement + text.slice(span.end);
    }, template);
}

export function extractStorageVariables(template: string): string[] {
  const names = new Set<string>();
  for (const span of findTemplateVariableSpans(template)) {
    for (const path of extractPathsFromExpression(span.inner)) {
      names.add(path);
    }
  }
  return [...names];
}
