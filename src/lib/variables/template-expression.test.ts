import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluateTemplateExpression,
  extractPathsFromExpression,
  parseTemplateExpression,
} from "./expression.ts";
import {
  displayToStorage,
  extractStorageVariables,
  findTemplateVariableSpans,
  variableDisplayPath,
} from "./format.ts";
import { resolveTemplate } from "./resolve.ts";
import type { TemplateContext } from "./context-types.ts";

const visitorContext: TemplateContext = {
  me: {
    id: "1",
    username: "robin",
    displayName: "Robin",
    global_name: "Robin",
    avatar: "",
    mention: "<@1>",
  },
  vars: {
    role: "mod",
    showName: "true",
  },
};

describe("findTemplateVariableSpans", () => {
  it("finds simple paths and expressions", () => {
    const spans = findTemplateVariableSpans('Hi {me.name + "!"}');
    assert.equal(spans.length, 1);
    assert.equal(spans[0]?.inner, 'me.name + "!"');
  });

  it("does not close early on ternary strings", () => {
    const input = '{me.name ? "yes" : "no"}';
    const spans = findTemplateVariableSpans(input);
    assert.equal(spans.length, 1);
    assert.equal(spans[0]?.inner, 'me.name ? "yes" : "no"');
  });

  it("supports double-brace placeholders", () => {
    const spans = findTemplateVariableSpans("{{discord.username}}");
    assert.equal(spans.length, 1);
    assert.equal(spans[0]?.raw, "{{discord.username}}");
  });
});

describe("evaluateTemplateExpression", () => {
  it("concatenates with +", () => {
    assert.equal(
      evaluateTemplateExpression('me.name + "!"', visitorContext),
      "Robin!",
    );
  });

  it("evaluates ternary with truthiness", () => {
    assert.equal(
      evaluateTemplateExpression('me.name ? me.name : "Guest"', visitorContext),
      "Robin",
    );
    assert.equal(
      evaluateTemplateExpression('me.avatar ? me.name : "Guest"', {
        me: { ...visitorContext.me!, avatar: "" },
      }),
      "Guest",
    );
  });

  it("evaluates == and !=", () => {
    assert.equal(
      evaluateTemplateExpression('vars.role == "mod" ? "Staff" : "Member"', visitorContext),
      "Staff",
    );
    assert.equal(
      evaluateTemplateExpression('vars.role != "mod" ? "Staff" : "Member"', visitorContext),
      "Member",
    );
  });

  it("evaluates && and ||", () => {
    assert.equal(
      evaluateTemplateExpression("me.name && vars.showName ? me.name : \"Anonymous\"", visitorContext),
      "Robin",
    );
    assert.equal(
      evaluateTemplateExpression('me.name || "fallback"', { me: undefined }),
      "fallback",
    );
  });

  it("evaluates unary !", () => {
    assert.equal(evaluateTemplateExpression('!me.name ? "no" : "yes"', visitorContext), "yes");
  });

  it("returns empty string for invalid expressions", () => {
    assert.equal(evaluateTemplateExpression("me.name ?", visitorContext), "");
    assert.equal(parseTemplateExpression("me.name ?"), null);
  });
});

describe("resolveTemplate", () => {
  it("substitutes expressions in template strings", () => {
    const result = resolveTemplate(
      'Hello {me.name ? me.name : "Guest"}!',
      visitorContext,
    );
    assert.equal(result, "Hello Robin!");
  });

  it("leaves invalid placeholders literal", () => {
    assert.equal(resolveTemplate("Hello {not closed", visitorContext), "Hello {not closed");
  });
});

describe("format helpers", () => {
  it("extracts path dependencies from expressions", () => {
    const paths = extractStorageVariables('{vars.role == "mod" ? me.name : "x"}');
    assert.deepEqual(new Set(paths), new Set(["vars.role", "me.name"]));
  });

  it("normalizes double braces for storage", () => {
    assert.equal(displayToStorage("{{me.name}}"), "{me.name}");
  });

  it("variableDisplayPath returns inner expression", () => {
    assert.equal(variableDisplayPath('{me.name + "a"}'), 'me.name + "a"');
  });

  it("extractPathsFromExpression collects all paths", () => {
    assert.deepEqual(
      new Set(extractPathsFromExpression("me.name && vars.foo")),
      new Set(["me.name", "vars.foo"]),
    );
  });
});
