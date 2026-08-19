export const DOCK_SITE_URL = "https://dock.surf";
export const DOCK_STAGING_URL = "https://dock.citrum.app";
export const LOCAL_SITE_URL = "http://localhost:3000";
export const DOCK_API_URL = "https://api.dock.surf";
export const MERIDIAN_CALLBACK_URL = `${DOCK_API_URL}/callback/meridian`;
export const DISCORD_CALLBACK_URL = `${DOCK_API_URL}/callback/discord`;

export const ALLOWED_REDIRECT_ORIGINS = [
  DOCK_SITE_URL,
  DOCK_STAGING_URL,
  LOCAL_SITE_URL,
] as const;

const PROVIDER_CALLBACK_URLS = {
  meridian: MERIDIAN_CALLBACK_URL,
  discord: DISCORD_CALLBACK_URL,
} as const;

type OAuthProvider = keyof typeof PROVIDER_CALLBACK_URLS;

function canonicalCallbackUrl(provider: OAuthProvider) {
  const origin =
    process.env.CUSTOM_AUTH_SITE_URL ?? process.env.CONVEX_SITE_URL ?? "";
  return `${origin}/api/auth/callback/${provider}`;
}

function rewriteTokenRedirectUri(
  body: BodyInit,
  provider: OAuthProvider,
): BodyInit {
  const canonical = canonicalCallbackUrl(provider);
  const publicUrl = PROVIDER_CALLBACK_URLS[provider];

  if (typeof body === "string") {
    return body
      .replaceAll(encodeURIComponent(canonical), encodeURIComponent(publicUrl))
      .replaceAll(canonical, publicUrl);
  }

  if (body instanceof URLSearchParams) {
    if (body.get("redirect_uri") === canonical) {
      const next = new URLSearchParams(body);
      next.set("redirect_uri", publicUrl);
      return next;
    }
    return body;
  }

  return body;
}

export function createOAuthFetch(
  provider: OAuthProvider,
  tokenUrlIncludes: string,
) {
  return async function oauthFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes(tokenUrlIncludes) && init?.body) {
      return await fetch(input, {
        ...init,
        body: rewriteTokenRedirectUri(init.body, provider),
      });
    }
    return await fetch(input, init);
  };
}

export const meridianFetch = createOAuthFetch("meridian", "/api/oauth/token");
export const discordFetch = createOAuthFetch("discord", "/api/oauth2/token");
