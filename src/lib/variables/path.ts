import type { TemplateContext } from "./context-types";

export function formatTemplateValue(value: unknown): string {
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

function resolveContextRoot(context: TemplateContext, firstPart: string): unknown {
  if (firstPart === "me") {
    return context.me ?? context.discord;
  }
  return (context as Record<string, unknown>)[firstPart];
}

export function readTemplatePath(context: TemplateContext, path: string): unknown {
  const parts = path.split(".").filter((part) => part.length > 0);
  if (parts.length === 0) return undefined;

  let current: unknown = resolveContextRoot(context, parts[0]!);

  for (let index = 1; index < parts.length; index += 1) {
    const part = parts[index]!;
    if (current == null || typeof current !== "object") return undefined;
    const record = current as Record<string, unknown>;
    if (part === "name" && typeof record.displayName === "string") {
      current = record.displayName;
      continue;
    }
    current = record[part];
  }

  if (path.startsWith("case.") && current === undefined && context.case) {
    const caseKey = path.slice("case.".length);
    if (caseKey === "slug") return context.case.publicSlug ?? context.case.slug;
    return (context.case as Record<string, unknown>)[caseKey];
  }

  return current;
}

export function isTemplateTruthy(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (value === false) return false;
  if (value === 0) return false;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed === "0" || trimmed.toLowerCase() === "false") return false;
    return true;
  }
  if (typeof value === "number") return value !== 0;
  if (typeof value === "object") {
    return formatTemplateValue(value).length > 0;
  }
  return Boolean(value);
}
