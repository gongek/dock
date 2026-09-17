import type { ModerationCaseRowPayload } from "@/lib/meridian/types";

export type DiscordVisitorContext = {
  id: string;
  username: string;
  displayName: string;
  global_name: string;
  avatar: string;
  mention: string;
};

export type BotTemplateContext = {
  id: string;
  name: string;
};

export type TemplateContext = {
  site?: {
    title?: string;
    slug?: string;
  };
  page?: {
    title?: string;
    slug?: string;
  };
  bot?: BotTemplateContext;
  case?: Partial<ModerationCaseRowPayload> & {
    slug?: string;
  };
  discord?: DiscordVisitorContext;
  me?: DiscordVisitorContext;
  vars?: Record<string, string | number | undefined>;
};
