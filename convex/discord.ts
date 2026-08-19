import { customFetch } from "@auth/core";
import Discord from "@auth/core/providers/discord";
import type { OAuthUserConfig } from "@auth/core/providers";
import type { DiscordProfile } from "@auth/core/providers/discord";
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
      if (profile.avatar === null) {
        const defaultAvatarNumber =
          profile.discriminator === "0"
            ? Number(BigInt(profile.id) >> BigInt(22)) % 6
            : parseInt(profile.discriminator) % 5;
        profile.image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
      } else {
        const format = profile.avatar.startsWith("a_") ? "gif" : "png";
        profile.image_url = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
      }
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
