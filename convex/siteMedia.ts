import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import type { Id } from "./_generated/dataModel";
import { publicUrlForR2Key, tryPublicUrlForR2Key } from "./r2Env";

async function assertSiteOwner(
  ctx: { db: any },
  siteId: Id<"sites">,
  userId: Id<"users">,
) {
  const site = await ctx.db.get(siteId);
  if (!site || site.ownerUserId !== userId) {
    throw new Error("Site not found.");
  }
  return site;
}

export const assertOwnedSiteInternal = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const site = await assertSiteOwner(ctx, args.siteId, user._id);
    return { siteId: site._id, ownerUserId: user._id };
  },
});

export const getMediaItemInternal = internalQuery({
  args: { siteId: v.id("sites"), mediaId: v.id("siteMedia") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertSiteOwner(ctx, args.siteId, user._id);
    const item = await ctx.db.get(args.mediaId);
    if (!item || item.siteId !== args.siteId) return null;
    return item;
  },
});

export const saveMedia = mutation({
  args: {
    siteId: v.id("sites"),
    r2Key: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertSiteOwner(ctx, args.siteId, user._id);
    const r2Key = args.r2Key.trim().replace(/^\/+/, "");
    if (!r2Key.startsWith(`public/ugc/dock/${args.siteId}/`)) {
      throw new Error("Invalid media key.");
    }
    const id = await ctx.db.insert("siteMedia", {
      siteId: args.siteId,
      r2Key,
      filename: args.filename,
      mimeType: args.mimeType,
      width: args.width,
      height: args.height,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const listMedia = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertSiteOwner(ctx, args.siteId, user._id);
    const items = await ctx.db
      .query("siteMedia")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    items.sort((a, b) => b.createdAt - a.createdAt);
    return items.flatMap((item) => {
      const r2Key = item.r2Key;
      if (!r2Key) return [];
      const url = tryPublicUrlForR2Key(r2Key);
      if (!url) return [];
      return [{ ...item, r2Key, url }];
    });
  },
});

export const deleteMediaRecordInternal = internalMutation({
  args: { siteId: v.id("sites"), mediaId: v.id("siteMedia") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertSiteOwner(ctx, args.siteId, user._id);
    const item = await ctx.db.get(args.mediaId);
    if (!item || item.siteId !== args.siteId) return;
    const site = await ctx.db.get(args.siteId);
    if (site && item.r2Key && site.faviconKey === item.r2Key) {
      const { _id, _creationTime: _created, faviconKey: _drop, faviconStorageId: _legacy, ...rest } =
        site;
      await ctx.db.replace(_id, { ...rest, updatedAt: Date.now() });
    }
    await ctx.db.delete(args.mediaId);
  },
});

export const publicUrlForKey = query({
  args: { r2Key: v.string() },
  handler: async (_ctx, args) => {
    return publicUrlForR2Key(args.r2Key);
  },
});
