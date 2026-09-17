"use client";

import type { ReactNode } from "react";
import { useFloatingTooltip } from "@/components/ui/floating-tooltip";
import { TEMPLATE_VAR_RE, variableDisplayPath } from "./format";
import { TEMPLATE_VAR_CHIP_CLASSES } from "./template-variable-html";
import { resolveTemplate, type TemplateContext } from "./resolve";

export { TEMPLATE_VAR_RE };

export type TemplateTextContext = TemplateContext & {
  resolveVariables?: boolean;
};

export type TemplateToken =
  | { type: "text"; content: string }
  | { type: "var"; raw: string };

export { variableDisplayPath };

function VariableIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5.25 2.75C3.25 4.25 3.25 6.5 3.25 8s0 3.75 2 5.25M10.75 2.75C12.75 4.25 12.75 6.5 12.75 8s0 3.75-2 5.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const VARIABLE_TOOLTIP = "This is a variable and will get replaced when published.";

function TemplateVariableToken({ raw }: { raw: string }) {
  const { showTooltip, hideTooltip, portal } = useFloatingTooltip({
    contentClassName: "whitespace-normal text-left",
    preferPlacement: "top",
  });

  return (
    <>
      <span
        className={`${TEMPLATE_VAR_CHIP_CLASSES} cursor-default`}
        tabIndex={0}
        onMouseEnter={(event) =>
          showTooltip(VARIABLE_TOOLTIP, event.currentTarget)
        }
        onMouseLeave={hideTooltip}
        onFocus={(event) => showTooltip(VARIABLE_TOOLTIP, event.currentTarget)}
        onBlur={hideTooltip}
      >
        <span
          className="flex size-4 shrink-0 items-center justify-center rounded bg-sky-500/15 text-sky-400"
          aria-hidden
        >
          <VariableIcon className="size-3" />
        </span>
        <span className="truncate font-medium">{raw}</span>
      </span>
      {portal}
    </>
  );
}

export function shouldResolveVariables(context?: TemplateTextContext): boolean {
  return context?.resolveVariables === true;
}

export function renderTemplateString(
  template: string,
  context?: TemplateTextContext,
): string {
  if (shouldResolveVariables(context)) {
    return resolveTemplate(template, context ?? {});
  }
  return template;
}

export function splitTemplateTokens(template: string): TemplateToken[] {
  const tokens: TemplateToken[] = [];
  let lastIndex = 0;
  const re = new RegExp(TEMPLATE_VAR_RE.source, "g");
  for (const match of template.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ type: "text", content: template.slice(lastIndex, index) });
    }
    tokens.push({ type: "var", raw: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < template.length) {
    tokens.push({ type: "text", content: template.slice(lastIndex) });
  }
  return tokens;
}

export function renderTemplateTokens(
  template: string,
  keyPrefix = "tpl",
): ReactNode {
  const tokens = splitTemplateTokens(template);
  if (tokens.length === 0) return template;
  if (tokens.length === 1 && tokens[0]?.type === "text") {
    return tokens[0].content;
  }
  return tokens.map((token, index) => {
    if (token.type === "text") {
      return token.content;
    }
    return <TemplateVariableToken key={`${keyPrefix}-${index}`} raw={token.raw} />;
  });
}

export function TemplateText({
  value,
  context,
  className,
}: {
  value: string;
  context?: TemplateTextContext;
  className?: string;
}) {
  if (shouldResolveVariables(context)) {
    const resolved = resolveTemplate(value, context ?? {});
    if (!className) return resolved;
    return <span className={className}>{resolved}</span>;
  }
  const content = renderTemplateTokens(value);
  if (!className) return content;
  return <span className={className}>{content}</span>;
}
