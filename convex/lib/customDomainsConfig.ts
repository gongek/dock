export function isCustomDomainsConfigured(): boolean {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  return Boolean(apiToken && zoneId);
}

export const CUSTOM_DOMAINS_NOT_CONFIGURED_MESSAGE =
  "Custom domains are not configured.";
