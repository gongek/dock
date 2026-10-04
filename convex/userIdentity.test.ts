import assert from "node:assert/strict";
import test from "node:test";
import { pickPrimaryUserId } from "./userIdentity";
import type { Id } from "./_generated/dataModel";

test("pickPrimaryUserId prefers the existing OAuth user", () => {
  const existing = "jx_existing" as Id<"users">;
  const other = "jx_other" as Id<"users">;
  assert.equal(pickPrimaryUserId([other, existing], existing), existing);
});

test("pickPrimaryUserId falls back to the first candidate", () => {
  const first = "jx_first" as Id<"users">;
  const second = "jx_second" as Id<"users">;
  assert.equal(pickPrimaryUserId([first, second], null), first);
});
