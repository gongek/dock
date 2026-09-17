import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

import { getCurrentUser } from "./lib/auth";

import type { Id } from "./_generated/dataModel";



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



function getDescendantIds(

  blockId: string,

  blocks: Array<{ blockId: string; parentBlockId?: string }>,

): string[] {

  const ids: string[] = [];

  function collect(parentId: string) {

    for (const child of blocks.filter((b) => b.parentBlockId === parentId)) {

      ids.push(child.blockId);

      collect(child.blockId);

    }

  }

  collect(blockId);

  return ids;

}



export const listBlocksForPage = query({

  args: { pageId: v.id("sitePages") },

  handler: async (ctx, args) => {

    const user = await getCurrentUser(ctx);

    const page = await ctx.db.get(args.pageId);

    if (!page) throw new Error("Page not found.");

    await assertSiteOwner(ctx, page.siteId, user._id);

    const blocks = await ctx.db

      .query("siteBlocks")

      .withIndex("by_page", (q) => q.eq("pageId", page._id))

      .collect();

    blocks.sort((a, b) => a.order - b.order);

    return blocks
      .filter((block) => block.type !== "breadcrumbs")
      .map((block) => ({
        ...block,
        props: JSON.parse(block.propsJson) as Record<string, unknown>,
      }));

  },

});



export const upsertBlock = mutation({

  args: {

    siteId: v.id("sites"),

    pageId: v.id("sitePages"),

    blockId: v.string(),

    type: v.string(),

    order: v.number(),

    parentBlockId: v.optional(v.string()),

    props: v.any(),

  },

  handler: async (ctx, args) => {

    const user = await getCurrentUser(ctx);

    await assertSiteOwner(ctx, args.siteId, user._id);

    const page = await ctx.db.get(args.pageId);

    if (!page || page.siteId !== args.siteId) {

      throw new Error("Page not found.");

    }



    const existing = await ctx.db

      .query("siteBlocks")

      .withIndex("by_page_and_block_id", (q) =>

        q.eq("pageId", args.pageId).eq("blockId", args.blockId),

      )

      .unique();



    const now = Date.now();

    const propsJson = JSON.stringify(args.props ?? {});



    if (existing) {

      await ctx.db.patch(existing._id, {

        type: args.type,

        order: args.order,

        parentBlockId: args.parentBlockId,

        propsJson,

        updatedAt: now,

      });

      await ctx.db.patch(args.siteId, { updatedAt: now });

      return existing._id;

    }



    const id = await ctx.db.insert("siteBlocks", {

      siteId: args.siteId,

      pageId: args.pageId,

      blockId: args.blockId,

      type: args.type,

      order: args.order,

      parentBlockId: args.parentBlockId,

      propsJson,

      createdAt: now,

      updatedAt: now,

    });

    await ctx.db.patch(args.siteId, { updatedAt: now });

    return id;

  },

});



export const reorderBlocks = mutation({

  args: {

    siteId: v.id("sites"),

    pageId: v.id("sitePages"),

    blocks: v.array(

      v.object({

        blockId: v.string(),

        order: v.number(),

        parentBlockId: v.optional(v.string()),

      }),

    ),

  },

  handler: async (ctx, args) => {

    const user = await getCurrentUser(ctx);

    await assertSiteOwner(ctx, args.siteId, user._id);

    const allBlocks = await ctx.db

      .query("siteBlocks")

      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))

      .collect();

    const byId = new Map(allBlocks.map((block) => [block.blockId, block]));

    const now = Date.now();

    for (const update of args.blocks) {

      const block = byId.get(update.blockId);

      if (!block) continue;

      await ctx.db.patch(block._id, {

        order: update.order,

        parentBlockId: update.parentBlockId,

        updatedAt: now,

      });

    }

    await ctx.db.patch(args.siteId, { updatedAt: now });

  },

});



export const deleteBlock = mutation({

  args: {

    siteId: v.id("sites"),

    pageId: v.id("sitePages"),

    blockId: v.string(),

  },

  handler: async (ctx, args) => {

    const user = await getCurrentUser(ctx);

    await assertSiteOwner(ctx, args.siteId, user._id);

    const allBlocks = await ctx.db

      .query("siteBlocks")

      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))

      .collect();

    const toRemove = new Set([

      args.blockId,

      ...getDescendantIds(args.blockId, allBlocks),

    ]);

    for (const block of allBlocks) {

      if (toRemove.has(block.blockId)) {

        await ctx.db.delete(block._id);

      }

    }

    await ctx.db.patch(args.siteId, { updatedAt: Date.now() });

  },

});



export const replacePageBlocks = mutation({

  args: {

    siteId: v.id("sites"),

    pageId: v.id("sitePages"),

    blocks: v.array(

      v.object({

        blockId: v.string(),

        type: v.string(),

        order: v.number(),

        parentBlockId: v.optional(v.string()),

        props: v.any(),

      }),

    ),

  },

  handler: async (ctx, args) => {

    const user = await getCurrentUser(ctx);

    await assertSiteOwner(ctx, args.siteId, user._id);

    const existing = await ctx.db

      .query("siteBlocks")

      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))

      .collect();

    for (const block of existing) {

      await ctx.db.delete(block._id);

    }

    const now = Date.now();

    for (const block of args.blocks) {

      await ctx.db.insert("siteBlocks", {

        siteId: args.siteId,

        pageId: args.pageId,

        blockId: block.blockId,

        type: block.type,

        order: block.order,

        parentBlockId: block.parentBlockId,

        propsJson: JSON.stringify(block.props ?? {}),

        createdAt: now,

        updatedAt: now,

      });

    }

    await ctx.db.patch(args.siteId, { updatedAt: now });

  },

});


