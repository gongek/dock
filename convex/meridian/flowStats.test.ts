import assert from "node:assert/strict";
import test from "node:test";
import { countFlows, selectFlowsForSite } from "./flowStats";

test("selectFlowsForSite uses single-bot account flows", () => {
  const flows = [
    { botId: "bot-a", kind: "slashCommand", name: "ping" },
    { botId: "bot-a", kind: "event", name: "on message" },
  ];

  const selected = selectFlowsForSite(flows, "robbie", [
    { id: "bot-a", name: "Robbie" },
  ]);

  assert.equal(selected.length, 2);
  assert.deepEqual(countFlows(selected), { commands: 1, events: 1, functions: 0 });
});

test("countFlows accepts type when kind is missing", () => {
  const counts = countFlows([
    { botId: "bot-a", type: "function", name: "util" },
  ]);
  assert.equal(counts.functions, 1);
});
