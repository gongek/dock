import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOCK_BOT_SELECT_SITE_ONBOARDING_CALLBACK,
  buildUnsignedDockBotSelectHandoffSearchParams,
  formatDockOnboardingBotSelectClientParam,
  parseDockBotSelectClientParam,
  resolveDockBotSelectReturnUrlFromClientParam,
  signDockBotSelectHandoff,
  verifyDockBotSelectHandoff,
  verifyDockBotSelectHandoffFromSearchParams,
} from "./dockBotSelectHandoff.ts";

const SECRET = "test-dock-meridian-bot-select-secret";
const RETURN_URL = "http://localhost:3001/callback/onboarding";

describe("dockBotSelectHandoff", () => {
  it("formats onboarding client params from SITE_URL", () => {
    assert.equal(
      formatDockOnboardingBotSelectClientParam("http://localhost:3001"),
      "dock.siteonboarding.local.3001",
    );
    assert.equal(
      formatDockOnboardingBotSelectClientParam("http://localhost:4000"),
      "dock.siteonboarding.local.3001",
    );
    assert.equal(formatDockOnboardingBotSelectClientParam("https://onboarding.dock.surf"), "dock.siteonboarding");
  });

  it("parses composite client params", () => {
    assert.deepEqual(parseDockBotSelectClientParam("dock.siteonboarding.local.3000"), {
      providerId: "dock",
      callbackSlug: DOCK_BOT_SELECT_SITE_ONBOARDING_CALLBACK,
      localPort: 3000,
    });
    assert.equal(
      resolveDockBotSelectReturnUrlFromClientParam("dock.siteonboarding.local.3001"),
      RETURN_URL,
    );
  });

  it("builds unsigned Meridian /select query params", () => {
    const params = buildUnsignedDockBotSelectHandoffSearchParams({
      callbackSlug: DOCK_BOT_SELECT_SITE_ONBOARDING_CALLBACK,
      localPort: 3001,
    });
    assert.equal(params.get("client"), "dock.siteonboarding.local.3001");
    assert.equal(params.get("return"), null);
    assert.equal(verifyDockBotSelectHandoffFromSearchParams(params, ""), RETURN_URL);
  });

  it("signs and verifies a localhost callback", () => {
    const signed = signDockBotSelectHandoff({
      secret: SECRET,
      returnUrl: RETURN_URL,
      timestampSeconds: 1_700_000_000,
    });
    assert.equal(
      verifyDockBotSelectHandoff({
        secret: SECRET,
        clientId: signed.clientId,
        returnUrl: signed.returnUrl,
        timestampSeconds: signed.timestampSeconds,
        signature: signed.signature,
        nowSeconds: 1_700_000_100,
      }),
      true,
    );
  });

  it("rejects tampered return URLs", () => {
    const signed = signDockBotSelectHandoff({
      secret: SECRET,
      returnUrl: RETURN_URL,
      timestampSeconds: 1_700_000_000,
    });
    assert.equal(
      verifyDockBotSelectHandoff({
        secret: SECRET,
        clientId: signed.clientId,
        returnUrl: "https://evil.example/callback/onboarding",
        timestampSeconds: signed.timestampSeconds,
        signature: signed.signature,
        nowSeconds: 1_700_000_100,
      }),
      false,
    );
  });
});
