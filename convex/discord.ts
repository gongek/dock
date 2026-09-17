import { customFetch } from "@auth/core";
import Discord from "@auth/core/providers/discord";
import type { OAuthUserConfig } from "@auth/core/providers";
import type { DiscordProfile } from "@auth/core/providers/discord";
import { discordAvatarUrl } from "./lib/discordProfile";
import { DISCORD_CALLBACK_URL, discordFetch } from "./oauth";

export default function DockDiscord(
  config: OAuthUserConfig<DiscordProfile> = {},
) {
  const provider = Discord(config);
  return {
    ...provider,
    authorization: {
      url: "https://discord.com/api/oauth2/authorize",
      params: {
        scope: "identify email",
        redirect_uri: DISCORD_CALLBACK_URL,
      },
    },
    profile(profile: DiscordProfile) {
      profile.image_url = discordAvatarUrl({
        id: profile.id,
        avatar: profile.avatar,
        discriminator: profile.discriminator,
      });
      return {
        id: profile.id,
        name: profile.global_name ?? profile.username,
        email: profile.email ?? undefined,
        image: profile.image_url,
        discordId: profile.id,
      };
    },
    [customFetch]: discordFetch,
  };
}
