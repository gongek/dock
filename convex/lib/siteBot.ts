import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type SiteBotContext = {
  id: string;
  name: string;
};

export async function resolveSiteBot(
  ctx: QueryCtx | MutationCtx,
  site: Pick<Doc<"sites">, "title" | "meridianBotId"> & { botName?: string },
): Promise<SiteBotContext | undefined> {
  const id =
    typeof site.meridianBotId === "string" ? site.meridianBotId.trim() : "";
  if (!id) return undefined;

  const mock = await ctx.db
    .query("meridianMockBots")
    .withIndex("by_meridian_bot_id", (q) => q.eq("meridianBotId", id))
    .unique();

  const mockName = mock?.name.trim() ?? "";
  const storedName = site.botName?.trim() ?? "";
  return {
    id,
    name: mockName || storedName || site.title.trim() || id,
  };
}
