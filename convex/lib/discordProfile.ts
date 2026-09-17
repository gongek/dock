export type DiscordUserProfile = {
  id: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
  discriminator?: string;
};

export function discordAvatarUrl(profile: DiscordUserProfile): string {
  if (!profile.avatar) {
    const discriminator = profile.discriminator ?? "0";
    const defaultAvatarNumber =
      discriminator === "0"
        ? Number(BigInt(profile.id) >> BigInt(22)) % 6
        : parseInt(discriminator, 10) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
  }
  const format = profile.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
}
