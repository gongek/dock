export const DOCK_SITE_URL = "https://dock.surf";
export const DOCK_STAGING_URL = "https://dock.citrum.app";
export const LOCAL_SITE_URL = "http://localhost:3000";
export const DOCK_API_URL = "https://api.dock.surf";
export const MERIDIAN_CALLBACK_URL = `${DOCK_API_URL}/callback/meridian`;

export const ALLOWED_REDIRECT_ORIGINS = [
  DOCK_SITE_URL,
  DOCK_STAGING_URL,
  LOCAL_SITE_URL,
] as const;

function canonicalMeridianCallbackUrl() {
  const origin =
    process.env.CUSTOM_AUTH_SITE_URL ?? process.env.CONVEX_SITE_URL ?? "";
  return `${origin}/api/auth/callback/meridian`;
}

function rewriteTokenRedirectUri(body: BodyInit): BodyInit {
  const canonical = canonicalMeridianCallbackUrl();

  if (typeof body === "string") {
    return body
      .replaceAll(encodeURIComponent(canonical), encodeURIComponent(MERIDIAN_CALLBACK_URL))
      .replaceAll(canonical, MERIDIAN_CALLBACK_URL);
  }

  if (body instanceof URLSearchParams) {
    if (body.get("redirect_uri") === canonical) {
      const next = new URLSearchParams(body);
      next.set("redirect_uri", MERIDIAN_CALLBACK_URL);
      return next;
    }
    return body;
  }

  return body;
}

export async function meridianFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("/api/oauth/token") && init?.body) {
    return await fetch(input, {
      ...init,
      body: rewriteTokenRedirectUri(init.body),
    });
  }
  return await fetch(input, init);
}
