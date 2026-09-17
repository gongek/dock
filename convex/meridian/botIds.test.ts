import assert from "node:assert/strict";
import test from "node:test";
import { collectMeridianBotIds, resolveMeridianBot } from "./botIds";

test("resolveMeridianBot matches label slug", () => {
  const bot = resolveMeridianBot("robbie", [
    { id: "uuid-bot", label: "robbie", name: "Robbie" },
  ]);
  assert.equal(bot?.id, "uuid-bot");
});

test("collectMeridianBotIds includes discord and flow aliases", () => {
  const ids = collectMeridianBotIds(
    "meridian-bot-id",
    [
      {
        id: "meridian-bot-id",
        discordId: "123456789012345678",
      },
    ],
    [{ botId: "meridian-bot-id", kind: "command", name: "ping" }],
  );

  assert.ok(ids.includes("meridian-bot-id"));
  assert.ok(ids.includes("123456789012345678"));
});
