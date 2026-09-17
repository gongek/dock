"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  canUseCustomDomain,
  maxCustomDomainsForPlan,
  normalizeOwnerPlan,
} from "./lib/siteLimits";
import {
  CUSTOM_DOMAINS_NOT_CONFIGURED_MESSAGE,
  isCustomDomainsConfigured,
} from "./lib/customDomainsConfig";
import {
  customDomainValidationError,
  normalizeCustomDomainHostname,
} from "./lib/customDomainValidators";
import {
  createCloudflareCustomHostname,
  deleteCloudflareCustomHostname,
  getCloudflareCustomHostname,
  resolveCustomDomainStatus,
} from "./lib/cloudflareCustomHostnames";
import type { Id } from "./_generated/dataModel";
import type { SiteCustomDomainRecord } from "./lib/siteCustomDomainTypes";

function serializeVerification(records: unknown) {
  return JSON.stringify(records);
}

function assertCustomDomainsConfigured() {
  if (!isCustomDomainsConfigured()) {
    throw new Error(CUSTOM_DOMAINS_NOT_CONFIGURED_MESSAGE);
  }
}

export const addDomain = action({
  args: {
    siteId: v.id("sites"),
    hostname: v.string(),
  },
  handler: async (ctx, args): Promise<SiteCustomDomainRecord> => {
    const user = await ctx.runQuery(
      internal.siteCustomDomainsInternalQueries.getCurrentUserForAction,
      {},
    );
    if (!user) {
      throw new Error("Not authenticated.");
    }

    const site = await ctx.runQuery(internal.siteCustomDomainsInternalQueries.getOwnedSiteForAction, {
      siteId: args.siteId,
      userId: user._id,
    });
    if (!site) {
      throw new Error("Site not found.");
    }

    const plan = normalizeOwnerPlan(user.ownerPlan);
    if (!canUseCustomDomain(plan)) {
      throw new Error("Custom domains are available on Pro and above.");
    }
    assertCustomDomainsConfigured();

    const validationError = customDomainValidationError(args.hostname);
    if (validationError) {
      throw new Error(validationError);
    }
    const hostnameLower = normalizeCustomDomainHostname(args.hostname)!;

    const existingHostname = await ctx.runQuery(
      internal.siteCustomDomainsInternalQueries.getDomainByHostnameLower,
      { hostnameLower },
    );
    if (existingHostname) {
      throw new Error("That domain is already connected to another site.");
    }

    const existingForSite = await ctx.runQuery(
      internal.siteCustomDomainsInternalQueries.listDomainCountForSite,
      { siteId: args.siteId },
    );
    if (existingForSite >= maxCustomDomainsForPlan(plan)) {
      throw new Error("You have reached the custom domain limit for your plan.");
    }

    const cloudflare = await createCloudflareCustomHostname(hostnameLower);
    const status = resolveCustomDomainStatus({
      cloudflareStatus: cloudflare.status,
      sslStatus: cloudflare.sslStatus,
    });

    const domainId: Id<"siteCustomDomains"> = await ctx.runMutation(
      internal.siteCustomDomainsInternal.insertCustomDomainInternal,
      {
        siteId: args.siteId,
        hostname: hostnameLower,
        hostnameLower,
        cloudflareHostnameId: cloudflare.id,
        sslStatus: cloudflare.sslStatus ?? undefined,
        verificationJson: serializeVerification(cloudflare.verificationRecords),
        status,
      },
    );

    const created: SiteCustomDomainRecord | null = await ctx.runQuery(
      internal.siteCustomDomainsInternalQueries.getDomainById,
      {
        domainId,
      },
    );
    if (!created) {
      throw new Error("Could not save custom domain.");
    }
    return created;
  },
});

export const verifyDomain = action({
  args: { domainId: v.id("siteCustomDomains") },
  handler: async (ctx, args): Promise<SiteCustomDomainRecord> => {
    const user = await ctx.runQuery(
      internal.siteCustomDomainsInternalQueries.getCurrentUserForAction,
      {},
    );
    if (!user) {
      throw new Error("Not authenticated.");
    }

    const domain = await ctx.runQuery(internal.siteCustomDomainsInternalQueries.getOwnedDomainForAction, {
      domainId: args.domainId,
      userId: user._id,
    });
    if (!domain) {
      throw new Error("Domain not found.");
    }
    assertCustomDomainsConfigured();
    if (!domain.cloudflareHostnameId) {
      throw new Error("This domain is not linked to Cloudflare yet.");
    }

    const cloudflare = await getCloudflareCustomHostname(domain.cloudflareHostnameId);
    const status = resolveCustomDomainStatus({
      cloudflareStatus: cloudflare.status,
      sslStatus: cloudflare.sslStatus,
    });

    await ctx.runMutation(internal.siteCustomDomainsInternal.updateCustomDomainInternal, {
      domainId: args.domainId,
      status,
      cloudflareHostnameId: cloudflare.id,
      sslStatus: cloudflare.sslStatus ?? undefined,
      verificationJson: serializeVerification(cloudflare.verificationRecords),
      lastError: status === "failed" ? "Domain verification failed." : undefined,
      verifiedAt: status === "active" ? Date.now() : domain.verifiedAt,
    });

    const updated: SiteCustomDomainRecord | null = await ctx.runQuery(
      internal.siteCustomDomainsInternalQueries.getDomainById,
      {
        domainId: args.domainId,
      },
    );
    if (!updated) {
      throw new Error("Domain not found.");
    }
    return updated;
  },
});

export const removeDomain = action({
  args: { domainId: v.id("siteCustomDomains") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(
      internal.siteCustomDomainsInternalQueries.getCurrentUserForAction,
      {},
    );
    if (!user) {
      throw new Error("Not authenticated.");
    }

    const domain = await ctx.runQuery(internal.siteCustomDomainsInternalQueries.getOwnedDomainForAction, {
      domainId: args.domainId,
      userId: user._id,
    });
    if (!domain) {
      throw new Error("Domain not found.");
    }
    assertCustomDomainsConfigured();

    if (domain.cloudflareHostnameId) {
      try {
        await deleteCloudflareCustomHostname(domain.cloudflareHostnameId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Cloudflare delete failed.";
        if (!message.toLowerCase().includes("not found")) {
          throw error;
        }
      }
    }

    await ctx.runMutation(internal.siteCustomDomainsInternal.deleteCustomDomainInternal, {
      domainId: args.domainId,
    });
    return null;
  },
});
