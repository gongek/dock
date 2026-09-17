import type { TemplateContext } from "./context-types";
import {
  formatTemplateValue,
  isTemplateTruthy,
  readTemplatePath,
} from "./path";

export type TemplateExpression =
  | { kind: "path"; path: string }
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "unary"; op: "!"; arg: TemplateExpression }
  | {
      kind: "binary";
      op: "+" | "==" | "!=" | "&&" | "||";
      left: TemplateExpression;
      right: TemplateExpression;
    }
  | {
      kind: "ternary";
      cond: TemplateExpression;
      whenTrue: TemplateExpression;
      whenFalse: TemplateExpression;
    };

const PATH_CHAR = /[a-zA-Z0-9_.[\]-]/;

type Token =
  | { type: "path"; value: string; start: number; end: number }
  | { type: "string"; value: string; start: number; end: number }
  | { type: "number"; value: number; start: number; end: number }
  | { type: "op"; value: string; start: number; end: number }
  | { type: "paren"; value: "(" | ")"; start: number; end: number };

function isPathStart(char: string): boolean {
  return /[a-zA-Z_]/.test(char);
}

function tokenizeExpression(source: string, start = 0, end = source.length): Token[] | null {
  const tokens: Token[] = [];
  let index = start;

  while (index < end) {
    const char = source[index]!;
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      const tokenStart = index;
      index += 1;
      let value = "";
      let closed = false;
      while (index < end) {
        const current = source[index]!;
        if (current === "\\" && index + 1 < end) {
          value += source[index + 1]!;
          index += 2;
          continue;
        }
        if (current === quote) {
          index += 1;
          closed = true;
          tokens.push({ type: "string", value, start: tokenStart, end: index });
          break;
        }
        value += current;
        index += 1;
      }
      if (!closed) return null;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    const twoChar = source.slice(index, index + 2);
    if (twoChar === "==" || twoChar === "!=" || twoChar === "&&" || twoChar === "||") {
      tokens.push({ type: "op", value: twoChar, start: index, end: index + 2 });
      index += 2;
      continue;
    }

    if (char === "+" || char === "?" || char === ":" || char === "!") {
      tokens.push({ type: "op", value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    if (/[0-9]/.test(char)) {
      const tokenStart = index;
      while (index < end && /[0-9.]/.test(source[index]!)) {
        index += 1;
      }
      const raw = source.slice(tokenStart, index);
      const value = Number(raw);
      if (Number.isNaN(value)) return null;
      tokens.push({ type: "number", value, start: tokenStart, end: index });
      continue;
    }

    if (isPathStart(char)) {
      const tokenStart = index;
      index += 1;
      while (index < end && PATH_CHAR.test(source[index]!)) {
        index += 1;
      }
      tokens.push({
        type: "path",
        value: source.slice(tokenStart, index),
        start: tokenStart,
        end: index,
      });
      continue;
    }

    return null;
  }

  return tokens;
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parseExpression(): TemplateExpression | null {
    const expr = this.parseTernary();
    if (!expr) return null;
    if (this.index < this.tokens.length) return null;
    return expr;
  }

  private parseTernary(): TemplateExpression | null {
    let expr = this.parseOr();
    if (!expr) return null;
    if (this.peekOp("?")) {
      this.index += 1;
      const whenTrue = this.parseTernary();
      if (!whenTrue || !this.peekOp(":")) return null;
      this.index += 1;
      const whenFalse = this.parseTernary();
      if (!whenFalse) return null;
      expr = { kind: "ternary", cond: expr, whenTrue, whenFalse };
    }
    return expr;
  }

  private parseOr(): TemplateExpression | null {
    let left = this.parseAnd();
    if (!left) return null;
    while (this.peekOp("||")) {
      this.index += 1;
      const right = this.parseAnd();
      if (!right) return null;
      left = { kind: "binary", op: "||", left, right };
    }
    return left;
  }

  private parseAnd(): TemplateExpression | null {
    let left = this.parseEquality();
    if (!left) return null;
    while (this.peekOp("&&")) {
      this.index += 1;
      const right = this.parseEquality();
      if (!right) return null;
      left = { kind: "binary", op: "&&", left, right };
    }
    return left;
  }

  private parseEquality(): TemplateExpression | null {
    let left = this.parseConcat();
    if (!left) return null;
    while (this.peekOp("==") || this.peekOp("!=")) {
      const op = this.tokens[this.index]!.value as "==" | "!=";
      this.index += 1;
      const right = this.parseConcat();
      if (!right) return null;
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseConcat(): TemplateExpression | null {
    let left = this.parseUnary();
    if (!left) return null;
    while (this.peekOp("+")) {
      this.index += 1;
      const right = this.parseUnary();
      if (!right) return null;
      left = { kind: "binary", op: "+", left, right };
    }
    return left;
  }

  private parseUnary(): TemplateExpression | null {
    if (this.peekOp("!")) {
      this.index += 1;
      const arg = this.parseUnary();
      if (!arg) return null;
      return { kind: "unary", op: "!", arg };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): TemplateExpression | null {
    const token = this.tokens[this.index];
    if (!token) return null;

    if (token.type === "path") {
      this.index += 1;
      return { kind: "path", path: token.value };
    }
    if (token.type === "string") {
      this.index += 1;
      return { kind: "string", value: token.value };
    }
    if (token.type === "number") {
      this.index += 1;
      return { kind: "number", value: token.value };
    }
    if (token.type === "paren" && token.value === "(") {
      this.index += 1;
      const inner = this.parseTernary();
      if (!inner || !this.peekParen(")")) return null;
      this.index += 1;
      return inner;
    }
    return null;
  }

  private peekOp(value: string): boolean {
    const token = this.tokens[this.index];
    return token?.type === "op" && token.value === value;
  }

  private peekParen(value: "(" | ")"): boolean {
    const token = this.tokens[this.index];
    return token?.type === "paren" && token.value === value;
  }
}

export function parseTemplateExpression(source: string): TemplateExpression | null {
  const trimmed = source.trim();
  if (!trimmed) return null;
  const tokens = tokenizeExpression(trimmed, 0, trimmed.length);
  if (!tokens) return null;
  return new Parser(tokens).parseExpression();
}

function skipQuotedString(source: string, start: number): number | null {
  const quote = source[start];
  if (quote !== '"' && quote !== "'") return null;
  let index = start + 1;
  while (index < source.length) {
    const char = source[index]!;
    if (char === "\\" && index + 1 < source.length) {
      index += 2;
      continue;
    }
    if (char === quote) return index + 1;
    index += 1;
  }
  return null;
}

/** Index of the closing `}` for an expression that starts at `innerStart`. */
export function findTemplateExpressionClose(
  source: string,
  innerStart: number,
  double: boolean,
): number | null {
  let index = innerStart;
  while (index < source.length) {
    const char = source[index]!;
    if (char === '"' || char === "'") {
      const next = skipQuotedString(source, index);
      if (next === null) return null;
      index = next;
      continue;
    }
    if (char === "}") {
      if (double) {
        if (source[index + 1] === "}") return index;
        return null;
      }
      return index;
    }
    index += 1;
  }
  return null;
}

export function isValidTemplateExpression(source: string): boolean {
  return parseTemplateExpression(source) !== null;
}

function evaluateNode(node: TemplateExpression, context: TemplateContext): unknown {
  switch (node.kind) {
    case "path":
      return readTemplatePath(context, node.path);
    case "string":
      return node.value;
    case "number":
      return node.value;
    case "unary": {
      if (node.op !== "!") return "";
      return !isTemplateTruthy(evaluateNode(node.arg, context));
    }
    case "binary": {
      const left = evaluateNode(node.left, context);
      if (node.op === "&&") {
        return isTemplateTruthy(left) ? evaluateNode(node.right, context) : left;
      }
      if (node.op === "||") {
        return isTemplateTruthy(left) ? left : evaluateNode(node.right, context);
      }
      const leftStr = formatTemplateValue(left);
      const rightStr = formatTemplateValue(evaluateNode(node.right, context));
      if (node.op === "+") return leftStr + rightStr;
      if (node.op === "==") return leftStr === rightStr;
      if (node.op === "!=") return leftStr !== rightStr;
      return "";
    }
    case "ternary": {
      const cond = evaluateNode(node.cond, context);
      return isTemplateTruthy(cond)
        ? evaluateNode(node.whenTrue, context)
        : evaluateNode(node.whenFalse, context);
    }
    default:
      return "";
  }
}

export function evaluateTemplateExpression(
  source: string,
  context: TemplateContext,
): unknown {
  const expr = parseTemplateExpression(source);
  if (!expr) return "";
  try {
    return evaluateNode(expr, context);
  } catch {
    return "";
  }
}

export function extractPathsFromExpression(source: string): string[] {
  const expr = parseTemplateExpression(source);
  if (!expr) return [];
  const paths = new Set<string>();
  walkPaths(expr, paths);
  return [...paths];
}

function walkPaths(node: TemplateExpression, paths: Set<string>): void {
  switch (node.kind) {
    case "path":
      paths.add(node.path);
      return;
    case "unary":
      walkPaths(node.arg, paths);
      return;
    case "binary":
      walkPaths(node.left, paths);
      walkPaths(node.right, paths);
      return;
    case "ternary":
      walkPaths(node.cond, paths);
      walkPaths(node.whenTrue, paths);
      walkPaths(node.whenFalse, paths);
      return;
    default:
      return;
  }
}

export function isSimplePathExpression(source: string): boolean {
  const trimmed = source.trim();
  if (!trimmed || !/^[a-zA-Z0-9_.[\]-]+$/.test(trimmed)) return false;
  return parseTemplateExpression(trimmed)?.kind === "path";
}
