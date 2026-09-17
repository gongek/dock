const VAR_NAME = "([a-zA-Z0-9_.[\\]-]+)";
const DOUBLE_VAR_RE = new RegExp(`\\{\\{${VAR_NAME}\\}\\}`, "g");
const SINGLE_VAR_RE = new RegExp(`\\{${VAR_NAME}\\}`, "g");

export const TEMPLATE_VAR_RE =
  /\{\{([a-zA-Z0-9_.[\]-]+)\}\}|\{([a-zA-Z0-9_.[\]-]+)\}/g;

export function variableDisplayPath(raw: string): string {
  const match = raw.match(/^\{\{?([a-zA-Z0-9_.[\]-]+)\}?\}$/);
  return match?.[1] ?? raw;
}

export function storageToDisplay(template: string): string {
  return template;
}

export function displayToStorage(template: string): string {
  return template.replace(DOUBLE_VAR_RE, (_match, name: string) => `{${name}}`);
}

export function extractStorageVariables(template: string): string[] {
  const names = new Set<string>();
  const withoutDoubles = template.replace(DOUBLE_VAR_RE, (_match, name: string) => {
    names.add(name);
    return "";
  });
  for (const match of withoutDoubles.matchAll(SINGLE_VAR_RE)) {
    names.add(match[1]!);
  }
  return [...names];
}
