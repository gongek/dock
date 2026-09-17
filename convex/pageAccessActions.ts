"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { evaluatePageAccess, type PageAccessResult } from "./lib/pageAccessCore";
import {
  isProtectedPageAccess,
  pageAccessSettingsForPage,
  type PageAccessSettings,
} from "./lib/pageAccessTypes";
import type { PublishedSnapshot } from "./lib/siteTypes";

const accessResultValidator = v.object({
  allowed: v.boolean(),
  reason: v.optional(v.string()),
  code: v.optional(v.string()),
});

type ActionCtx = {
  runQuery: (query: any, args: any) => Promise<any>;
};

async function resolvePageAccessSettingsForSlug(
  ctx: ActionCtx,
  input: {
    site: Doc<"sites">;
    pageSlug: string;
    draft: boolean;
  },
): Promise<PageAccessSettings | null> {
  if (input.draft) {
    const page = await ctx.runQuery(internal.pageAccessInternal.getPageBySlugInternal, {
      siteId: input.site._id,
      pageSlug: input.pageSlug,
    });
    if (!page) return null;
    return pageAccessSettingsForPage(page);
  }

  if (!input.site.publishedSnapshotJson) return null;
  const snapshot = JSON.parse(input.site.publishedSnapshotJson) as PublishedSnapshot;
  const page = snapshot.pages.find((entry) => entry.slug === input.pageSlug);
  if (!page) return null;
  return pageAccessSettingsForPage(page);
}

async function evaluatePageAccessForSlug(
  ctx: ActionCtx,
  input: {
    siteSlug: string;
    pageSlug: string;
    discordUserId?: string;
    draft?: boolean;
  },
): Promise<PageAccessResult> {
  const site = (await ctx.runQuery(internal.siteDiscordAuthInternal.getSiteBySlugInternal, {
    slug: input.siteSlug,
  })) as Doc<"sites"> | null;
  if (!site) {
    return { allowed: false, reason: "Site not found." };
  }

  const useDraft = input.draft === true || site.hostKind === "bot_subdomain";
  const pageAccessSettings = await resolvePageAccessSettingsForSlug(ctx, {
    site,
    pageSlug: input.pageSlug,
    draft: useDraft,
  });
  if (!pageAccessSettings) {
    return { allowed: false, reason: "Page not found." };
  }

  if (!isProtectedPageAccess(pageAccessSettings)) {
    return { allowed: true, code: "public" };
  }

  const mockBot = site.meridianBotId
    ? ((await ctx.runQuery(internal.siteDiscordAuthInternal.getMockBotInternal, {
        meridianBotId: site.meridianBotId,
      })) as Doc<"meridianMockBots"> | null)
    : null;

  let meridianUser: Doc<"users"> | null = null;
  let accessToken: string | undefined;
  if (input.discordUserId) {
    meridianUser = (await ctx.runQuery(
      internal.siteDiscordAuthInternal.getUserByDiscordIdInternal,
      { discordUserId: input.discordUserId },
    )) as Doc<"users"> | null;
    const session = (await ctx.runQuery(internal.pageAccessInternal.getDiscordSessionInternal, {
      discordUserId: input.discordUserId,
    })) as { accessTokenEnc?: string } | null;
    accessToken = session?.accessTokenEnc;
  }

  return await evaluatePageAccess({
    site,
    pageAccessSettings,
    discordUserId: input.discordUserId,
    accessToken,
    mockBot,
    meridianUser,
  });
}

export const checkPageAccess = action({
  args: {
    siteSlug: v.string(),
    pageSlug: v.string(),
    discordUserId: v.optional(v.string()),
    draft: v.optional(v.boolean()),
  },
  returns: accessResultValidator,
  handler: async (ctx, args): Promise<PageAccessResult> => {
    return await evaluatePageAccessForSlug(ctx, args);
  },
});

export const checkPagesAccess = action({
  args: {
    siteSlug: v.string(),
    pageSlugs: v.array(v.string()),
    discordUserId: v.optional(v.string()),
    draft: v.optional(v.boolean()),
  },
  returns: v.object({
    allowedSlugs: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const allowedSlugs: string[] = [];
    for (const pageSlug of args.pageSlugs) {
      const result = await evaluatePageAccessForSlug(ctx, {
        siteSlug: args.siteSlug,
        pageSlug,
        discordUserId: args.discordUserId,
        draft: args.draft,
      });
      if (result.allowed) {
        allowedSlugs.push(pageSlug);
      }
    }
    return { allowedSlugs };
  },
});
