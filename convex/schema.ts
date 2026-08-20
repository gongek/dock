import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    meridianId: v.optional(v.string()),
    discordId: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_meridian_id", ["meridianId"])
    .index("by_discord_id", ["discordId"]),
  pendingDiscordSignups: defineTable({
    token: v.string(),
    providerAccountId: v.string(),
    profile: v.any(),
    signature: v.string(),
    redirectTo: v.string(),
    expirationTime: v.number(),
  }).index("by_token", ["token"]),
});
