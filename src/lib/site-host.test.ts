import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isDockApiHost,
  parseSiteSlugFromHost,
} from "./site-host";

test("api.dock.surf is not treated as a tenant site slug", () => {
  assert.equal(parseSiteSlugFromHost("api.dock.surf"), null);
  assert.equal(isDockApiHost("api.dock.surf"), true);
});

test("tenant subdomains still resolve", () => {
  assert.equal(parseSiteSlugFromHost("mybot.dock.surf"), "mybot");
  assert.equal(isDockApiHost("mybot.dock.surf"), false);
});
