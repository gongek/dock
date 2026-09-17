import assert from "node:assert/strict";
import test from "node:test";
import { mapMeridianCaseRow } from "./casesClient";

test("mapMeridianCaseRow maps Meridian API shape to Dock case payload", () => {
  const mapped = mapMeridianCaseRow({
    id: "case_abc",
    caseNumber: 12,
    public_slug: "Ab12Cd3",
    scope: "guild",
    guildId: "999",
    targetUser_id: "111",
    type: "warn",
    reason: "Spam",
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_100_000,
  });

  assert.ok(mapped);
  assert.equal(mapped?.caseId, "case_abc");
  assert.equal(mapped?.caseNumber, 12);
  assert.equal(mapped?.publicSlug, "Ab12Cd3");
  assert.equal(mapped?.guildKey, "999");
  assert.equal(mapped?.type, "warn");
});
