export function getMeridianOAuthCredentials(): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = process.env.AUTH_MERIDIAN_ID?.trim();
  const clientSecret = process.env.AUTH_MERIDIAN_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}
