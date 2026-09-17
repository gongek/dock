"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createR2PresignedPutUrl, deleteR2Object, formatR2Error } from "./r2Client";
import { publicUrlForR2Key, SITE_MEDIA_MAX_BYTES } from "./r2Env";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

function extensionForUpload(mimeType: string, filename: string): string {
  const fromMime: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
  };
  if (fromMime[mimeType]) return fromMime[mimeType];
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  return "bin";
}

export const prepareMediaUpload = action({
  args: {
    siteId: v.id("sites"),
    filename: v.string(),
    contentType: v.string(),
    contentLength: v.number(),
  },
  returns: v.object({
    uploadUrl: v.string(),
    r2Key: v.string(),
    contentType: v.string(),
    publicUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.siteMedia.assertOwnedSiteInternal, {
      siteId: args.siteId,
    });
    const contentType = args.contentType.trim().toLowerCase();
    if (!ALLOWED_MIME.has(contentType)) {
      throw new Error("That image type is not supported.");
    }
    if (args.contentLength <= 0 || args.contentLength > SITE_MEDIA_MAX_BYTES) {
      throw new Error("Image must be 8MB or smaller.");
    }
    const ext = extensionForUpload(contentType, args.filename);
    const r2Key = `public/ugc/dock/${args.siteId}/${crypto.randomUUID()}.${ext}`;
    try {
      const uploadUrl = await createR2PresignedPutUrl({
        key: r2Key,
        contentType,
        contentLength: args.contentLength,
      });
      return {
        uploadUrl,
        r2Key,
        contentType,
        publicUrl: publicUrlForR2Key(r2Key),
      };
    } catch (error) {
      throw new Error(formatR2Error(error, "Could not prepare image upload."));
    }
  },
});

export const deleteMedia = action({
  args: { siteId: v.id("sites"), mediaId: v.id("siteMedia") },
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.siteMedia.getMediaItemInternal, {
      siteId: args.siteId,
      mediaId: args.mediaId,
    });
    if (!item) return;
    if (item.r2Key) {
      await deleteR2Object(item.r2Key);
    }
    await ctx.runMutation(internal.siteMedia.deleteMediaRecordInternal, {
      siteId: args.siteId,
      mediaId: args.mediaId,
    });
  },
});
