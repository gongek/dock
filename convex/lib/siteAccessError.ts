export const SiteAccessErrorCode = {
  InvalidLink: 1 << 0,
  SiteNotFound: 1 << 1,
  DiscordUnavailable: 1 << 2,
  NoStaffAccess: 1 << 3,
  DiscordNotLinked: 1 << 4,
  DiscordAlreadyLinked: 1 << 5,
  DiscordTokenFailed: 1 << 6,
  DiscordCancelled: 1 << 7,
  DiscordSignInFailed: 1 << 8,
  Generic: 1 << 9,
} as const;

export type SiteAccessErrorCodeValue =
  (typeof SiteAccessErrorCode)[keyof typeof SiteAccessErrorCode];

const KNOWN_ERROR_CODES = new Set<number>(Object.values(SiteAccessErrorCode));

type SiteAccessErrorDetails = {
  title: string;
  message: string;
};

const SITE_ACCESS_ERROR_DETAILS: Record<
  SiteAccessErrorCodeValue,
  SiteAccessErrorDetails
> = {
  [SiteAccessErrorCode.InvalidLink]: {
    title: "Invalid sign-in link",
    message: "This sign-in link is invalid.",
  },
  [SiteAccessErrorCode.SiteNotFound]: {
    title: "Site not found",
    message: "This site could not be found.",
  },
  [SiteAccessErrorCode.DiscordUnavailable]: {
    title: "Discord sign-in unavailable",
    message: "Discord sign-in is not available right now. Please try again later.",
  },
  [SiteAccessErrorCode.NoStaffAccess]: {
    title: "Access denied",
    message: "You do not have access to this staff panel.",
  },
  [SiteAccessErrorCode.DiscordNotLinked]: {
    title: "Discord sign-in failed",
    message: "This Discord account is not linked to Dock.",
  },
  [SiteAccessErrorCode.DiscordAlreadyLinked]: {
    title: "Discord sign-in failed",
    message:
      "This Discord account is already linked to another Dock profile.",
  },
  [SiteAccessErrorCode.DiscordTokenFailed]: {
    title: "Discord sign-in failed",
    message: "Discord sign-in expired or was already used. Please try again.",
  },
  [SiteAccessErrorCode.DiscordCancelled]: {
    title: "Discord sign-in failed",
    message: "Discord sign-in was cancelled or failed.",
  },
  [SiteAccessErrorCode.DiscordSignInFailed]: {
    title: "Discord sign-in failed",
    message: "Could not sign you in with Discord. Please try again later.",
  },
  [SiteAccessErrorCode.Generic]: {
    title: "Could not open site",
    message: "Something went wrong while trying to open this site.",
  },
};

const FALLBACK_ERROR = SITE_ACCESS_ERROR_DETAILS[SiteAccessErrorCode.Generic];

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Something went wrong.";
}

function unwrapConvexErrorMessage(message: string): string {
  const nested = message.match(/Uncaught Error: ([\s\S]+)$/);
  if (nested?.[1]) {
    return nested[1].trim();
  }
  return message;
}

export function publicSiteAccessErrorCode(error: unknown): SiteAccessErrorCodeValue {
  const raw = unwrapConvexErrorMessage(extractErrorMessage(error));

  if (
    raw.includes("AUTH_DISCORD_ID") ||
    raw.includes("AUTH_DISCORD_SECRET") ||
    raw.includes("DISCORD_CLIENT_ID") ||
    raw.includes("DISCORD_CLIENT_SECRET")
  ) {
    return SiteAccessErrorCode.DiscordUnavailable;
  }

  if (raw.includes("Site not found")) {
    return SiteAccessErrorCode.SiteNotFound;
  }

  if (raw.includes("Missing slug") || raw.includes("Invalid OAuth state")) {
    return SiteAccessErrorCode.InvalidLink;
  }

  if (raw.includes("You do not have access to this staff panel.")) {
    return SiteAccessErrorCode.NoStaffAccess;
  }

  if (raw.includes("This Discord account is not linked to Dock.")) {
    return SiteAccessErrorCode.DiscordNotLinked;
  }

  if (raw.includes("already linked to another Dock profile")) {
    return SiteAccessErrorCode.DiscordAlreadyLinked;
  }

  if (raw.includes("cannot be merged automatically")) {
    return SiteAccessErrorCode.DiscordSignInFailed;
  }

  if (raw.includes("Discord token exchange failed.")) {
    return SiteAccessErrorCode.DiscordTokenFailed;
  }

  if (
    raw.includes("Request ID:") ||
    raw.includes("Server Error") ||
    raw.includes("Uncaught Error:")
  ) {
    return SiteAccessErrorCode.DiscordSignInFailed;
  }

  return SiteAccessErrorCode.Generic;
}

export function siteAccessErrorDetails(
  code: SiteAccessErrorCodeValue,
): SiteAccessErrorDetails {
  return SITE_ACCESS_ERROR_DETAILS[code] ?? FALLBACK_ERROR;
}

function errorSigningSecret(): string {
  const secret =
    process.env.AUTH_DISCORD_SECRET?.trim() ??
    process.env.DISCORD_CLIENT_SECRET?.trim() ??
    process.env.JWT_PRIVATE_KEY?.trim();
  if (!secret) {
    throw new Error(
      "AUTH_DISCORD_SECRET is required for site access error signing.",
    );
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function signPayload(mask: number, slug?: string): string {
  const normalizedSlug = slug?.trim().toLowerCase() ?? "";
  return `${mask}\0${normalizedSlug}`;
}

async function hmacSha256(message: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(errorSigningSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
}

export async function signSiteAccessError(
  mask: SiteAccessErrorCodeValue,
  slug?: string,
): Promise<string> {
  const signature = await hmacSha256(signPayload(mask, slug));
  return toBase64Url(signature);
}

export async function verifySiteAccessError(
  mask: number,
  signature: string,
  slug?: string,
): Promise<boolean> {
  if (!KNOWN_ERROR_CODES.has(mask)) {
    return false;
  }

  try {
    const expected = await signSiteAccessError(
      mask as SiteAccessErrorCodeValue,
      slug,
    );
    const left = fromBase64Url(expected);
    const right = fromBase64Url(signature);
    if (left.length !== right.length) {
      return false;
    }
    let diff = 0;
    for (let i = 0; i < left.length; i += 1) {
      diff |= left[i] ^ right[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

function allowUnsignedSiteAccessErrors(): boolean {
  return process.env.NODE_ENV === "development";
}

export async function buildSiteAccessErrorUrl(
  origin: string,
  code: SiteAccessErrorCodeValue,
  options?: { slug?: string },
): Promise<string> {
  const url = new URL("/site-access/error", origin);
  const slug = options?.slug?.trim().toLowerCase();
  url.searchParams.set("m", String(code));
  if (slug) {
    url.searchParams.set("slug", slug);
  }

  try {
    url.searchParams.set("e", await signSiteAccessError(code, slug));
  } catch (error) {
    if (!allowUnsignedSiteAccessErrors()) {
      throw error;
    }
  }

  return url.toString();
}

export async function resolveSiteAccessErrorFromQuery(params: {
  m?: string;
  e?: string;
  slug?: string;
}): Promise<{
  code: SiteAccessErrorCodeValue;
  title: string;
  message: string;
  slug?: string;
}> {
  const mask = Number.parseInt(params.m ?? "", 10);
  const signature = params.e?.trim() ?? "";
  const slug = params.slug?.trim().toLowerCase();

  if (!Number.isInteger(mask) || !KNOWN_ERROR_CODES.has(mask)) {
    return {
      code: SiteAccessErrorCode.Generic,
      ...FALLBACK_ERROR,
    };
  }

  if (!signature) {
    if (allowUnsignedSiteAccessErrors()) {
      const details = siteAccessErrorDetails(mask as SiteAccessErrorCodeValue);
      return {
        code: mask as SiteAccessErrorCodeValue,
        title: details.title,
        message: details.message,
        ...(slug ? { slug } : {}),
      };
    }
    return {
      code: SiteAccessErrorCode.Generic,
      ...FALLBACK_ERROR,
    };
  }

  if (!(await verifySiteAccessError(mask, signature, slug))) {
    return {
      code: SiteAccessErrorCode.Generic,
      ...FALLBACK_ERROR,
    };
  }

  const details = siteAccessErrorDetails(mask as SiteAccessErrorCodeValue);
  return {
    code: mask as SiteAccessErrorCodeValue,
    title: details.title,
    message: details.message,
    ...(slug ? { slug } : {}),
  };
}
