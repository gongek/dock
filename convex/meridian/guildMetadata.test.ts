import assert from "node:assert/strict";
import test from "node:test";
import {
  listGuildsForMeridianBot,
  resolvePrimaryGuildIdForBot,
} from "./guildMetadata";

test("resolvePrimaryGuildIdForBot prefers primary guild flag", () => {
  const guildId = resolvePrimaryGuildIdForBot(
    "bot_1",
    [
      { botId: "bot_1", guildId: "111", name: "Alpha", primary: false },
      { botId: "bot_1", guildId: "222", name: "Beta", primary: true },
    ],
    [{ id: "bot_1", name: "Bot" }],
  );
  assert.equal(guildId, "222");
});

test("listGuildsForMeridianBot labels guilds with names", () => {
  const guilds = listGuildsForMeridianBot(
    "bot_1",
    [{ botId: "bot_1", guildId: "222", name: "Beta Server" }],
    [{ id: "bot_1", name: "Bot" }],
  );
  assert.equal(guilds.length, 1);
  assert.equal(guilds[0]?.label, "Beta Server");
});
