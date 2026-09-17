import assert from "node:assert/strict";
import test from "node:test";
import {
  DOCK_MERIDIAN_OAUTH_SCOPES_CORE,
  DOCK_MERIDIAN_SCOPE_BUNDLE,
  MERIDIAN_SCOPE,
} from "./scopes";

test("core OAuth bundle includes user billing and staff read", () => {
  assert.match(DOCK_MERIDIAN_OAUTH_SCOPES_CORE, /\buser\.billing\.read\b/);
  assert.match(DOCK_MERIDIAN_OAUTH_SCOPES_CORE, /\buser\.staff\.read\b/);
  assert.match(DOCK_MERIDIAN_OAUTH_SCOPES_CORE, /\bisMeridianStaff\b/);
  assert.doesNotMatch(
    DOCK_MERIDIAN_OAUTH_SCOPES_CORE,
    /(?:^|\s)billing\.read(?:\s|$)/,
  );
});

test("incremental bundles group optional Meridian scopes", () => {
  assert.match(DOCK_MERIDIAN_SCOPE_BUNDLE.publishedSiteData, /\bcases\.read\b/);
  assert.match(DOCK_MERIDIAN_SCOPE_BUNDLE.publishedSiteData, /\bvariables\.read\b/);
  assert.match(DOCK_MERIDIAN_SCOPE_BUNDLE.publicStatsSetup, /\bbotstatus\.write\b/);
  assert.match(DOCK_MERIDIAN_SCOPE_BUNDLE.automationSetup, /\bflows\.write\b/);
  assert.equal(MERIDIAN_SCOPE.userBillingRead, "user.billing.read");
});
