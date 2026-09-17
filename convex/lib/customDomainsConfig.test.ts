import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

function isCustomDomainsConfigured(): boolean {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  return Boolean(apiToken && zoneId);
}

const ORIGINAL_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ORIGINAL_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.CLOUDFLARE_API_TOKEN;
  } else {
    process.env.CLOUDFLARE_API_TOKEN = ORIGINAL_TOKEN;
  }
  if (ORIGINAL_ZONE_ID === undefined) {
    delete process.env.CLOUDFLARE_ZONE_ID;
  } else {
    process.env.CLOUDFLARE_ZONE_ID = ORIGINAL_ZONE_ID;
  }
});

describe("isCustomDomainsConfigured", () => {
  it("returns false when both env vars are missing", () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ZONE_ID;
    assert.equal(isCustomDomainsConfigured(), false);
  });

  it("returns false when only the API token is set", () => {
    process.env.CLOUDFLARE_API_TOKEN = "token";
    delete process.env.CLOUDFLARE_ZONE_ID;
    assert.equal(isCustomDomainsConfigured(), false);
  });

  it("returns false when only the zone ID is set", () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    process.env.CLOUDFLARE_ZONE_ID = "zone";
    assert.equal(isCustomDomainsConfigured(), false);
  });

  it("returns true when both env vars are set", () => {
    process.env.CLOUDFLARE_API_TOKEN = "token";
    process.env.CLOUDFLARE_ZONE_ID = "zone";
    assert.equal(isCustomDomainsConfigured(), true);
  });

  it("treats whitespace-only values as missing", () => {
    process.env.CLOUDFLARE_API_TOKEN = "  ";
    process.env.CLOUDFLARE_ZONE_ID = "zone";
    assert.equal(isCustomDomainsConfigured(), false);
  });
});
