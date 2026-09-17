import assert from "node:assert/strict";
import test from "node:test";

function resolveDiscordScopesForPageAccessMode(mode: string): string {
  const scopes = new Set<string>(["identify"]);
  if (mode === "staff" || mode === "roles") scopes.add("guilds");
  if (mode === "roles") scopes.add("guilds.members.read");
  return ["identify", "guilds", "guilds.members.read"].filter((scope) => scopes.has(scope)).join(" ");
}

function normalizeIdList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

test("minimum Discord scopes per page access mode", () => {
  assert.equal(resolveDiscordScopesForPageAccessMode("public"), "identify");
  assert.equal(resolveDiscordScopesForPageAccessMode("authenticated"), "identify");
  assert.equal(resolveDiscordScopesForPageAccessMode("whitelist"), "identify");
  assert.equal(resolveDiscordScopesForPageAccessMode("staff"), "identify guilds");
  assert.equal(
    resolveDiscordScopesForPageAccessMode("roles"),
    "identify guilds guilds.members.read",
  );
});

test("normalizeIdList trims and dedupes", () => {
  assert.deepEqual(normalizeIdList([" 1 ", "1", "2"]), ["1", "2"]);
});
