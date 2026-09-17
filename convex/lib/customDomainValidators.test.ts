import { describe, it } from "node:test";
import assert from "node:assert/strict";

const DOCK_APEX = "dock.surf";
const DOCK_STAGING_APEX = "dock.citrum.app";
const HOSTNAME_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function isReservedHostname(hostnameLower: string): boolean {
  if (
    hostnameLower === DOCK_APEX ||
    hostnameLower === `www.${DOCK_APEX}` ||
    hostnameLower === DOCK_STAGING_APEX ||
    hostnameLower === `www.${DOCK_STAGING_APEX}` ||
    hostnameLower === "localhost" ||
    hostnameLower.endsWith(".localhost")
  ) {
    return true;
  }
  if (
    hostnameLower.endsWith(`.${DOCK_APEX}`) ||
    hostnameLower.endsWith(`.${DOCK_STAGING_APEX}`)
  ) {
    return true;
  }
  return false;
}

function normalizeCustomDomainHostname(raw: string): string | null {
  let hostname = raw.trim().toLowerCase();
  if (!hostname) return null;
  if (hostname.endsWith(".")) hostname = hostname.slice(0, -1);
  if (hostname.includes("://") || hostname.includes("/") || hostname.includes(":")) {
    return null;
  }
  if (hostname.startsWith("*.")) return null;
  if (IPV4_RE.test(hostname)) return null;
  if (!HOSTNAME_RE.test(hostname)) return null;
  if (isReservedHostname(hostname)) return null;
  return hostname;
}

function customDomainValidationError(raw: string): string | null {
  const normalized = normalizeCustomDomainHostname(raw);
  if (normalized) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "Enter a domain name.";
  if (isReservedHostname(trimmed.replace(/\.$/, ""))) {
    return "That domain is reserved by Dock.";
  }
  return "Enter a valid domain name like www.example.com.";
}

describe("normalizeCustomDomainHostname", () => {
  it("accepts a valid hostname", () => {
    assert.equal(normalizeCustomDomainHostname("WWW.Example.com"), "www.example.com");
  });

  it("rejects dock subdomains", () => {
    assert.equal(normalizeCustomDomainHostname("staff.dock.surf"), null);
  });

  it("rejects reserved apex domains", () => {
    assert.equal(normalizeCustomDomainHostname("dock.surf"), null);
    assert.equal(normalizeCustomDomainHostname("dock.citrum.app"), null);
  });

  it("rejects invalid values", () => {
    assert.equal(normalizeCustomDomainHostname("https://example.com"), null);
    assert.equal(normalizeCustomDomainHostname("127.0.0.1"), null);
    assert.equal(normalizeCustomDomainHostname("*.example.com"), null);
  });
});

describe("customDomainValidationError", () => {
  it("returns null for valid domains", () => {
    assert.equal(customDomainValidationError("docs.example.com"), null);
  });

  it("returns a helpful message for reserved domains", () => {
    assert.match(
      customDomainValidationError("panel.dock.surf") ?? "",
      /reserved/i,
    );
  });
});
