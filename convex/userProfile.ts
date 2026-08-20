export const DISCORD_EMAIL_REQUIRED = "DISCORD_EMAIL_REQUIRED";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function hasUsableEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_PATTERN.test(email.trim());
}

export function sanitizeUserProfile(
  profile: Record<string, unknown>,
  providerId: string,
) {
  const name = typeof profile.name === "string" ? profile.name : undefined;
  const image = typeof profile.image === "string" ? profile.image : undefined;
  const email = hasUsableEmail(profile.email)
    ? profile.email.trim().toLowerCase()
    : undefined;
  const meridianId =
    typeof profile.meridianId === "string" ? profile.meridianId : undefined;
  const discordId =
    typeof profile.discordId === "string"
      ? profile.discordId
      : providerId === "discord" && typeof profile.id === "string"
        ? profile.id
        : undefined;

  return {
    ...(name ? { name } : {}),
    ...(image ? { image } : {}),
    ...(email ? { email } : {}),
    ...(meridianId ? { meridianId } : {}),
    ...(discordId ? { discordId } : {}),
  };
}
