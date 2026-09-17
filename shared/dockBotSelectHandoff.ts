import { createHmac, timingSafeEqual } from "node:crypto";

/** Keep in sync with `meridian/shared/dockBotSelectHandoff.ts`. */

/** OAuth-style client provider Meridian expects on `/select` for Dock bot picking. */
export const DOCK_BOT_SELECT_CLIENT_ID = "dock";

/** Callback slug in `client=dock.<slug>` (production Dock site onboarding). */
export const DOCK_BOT_SELECT_SITE_ONBOARDING_CALLBACK = "siteonboarding";

export const DOCK_BOT_SELECT_CLIENT_PARAM = "client";
export const DOCK_BOT_SELECT_RETURN_PARAM = "return";
export const DOCK_BOT_SELECT_TIMESTAMP_PARAM = "ts";
export const DOCK_BOT_SELECT_SIGNATURE_PARAM = "sig";

export const DOCK_BOT_SELECT_MAX_AGE_SECONDS = 900;
const DOCK_BOT_SELECT_SIGNATURE_VERSION = "dock-bot-select-v1";

export const DOCK_ONBOARDING_CALLBACK_PATH = "/callback/onboarding";

/** Fixed port in `client=dock.siteonboarding.local.<port>` for Dock local dev. */
export const DOCK_BOT_SELECT_LOCAL_DEV_PORT = 3001;

const DOCK_BOT_SELECT_LOCAL_SUFFIX = ".local.";

type DockBotSelectCallbackDef = {
  path: string;
  productionOrigin: string;
};

const DOCK_BOT_SELECT_CALLBACKS: Record<string, DockBotSelectCallbackDef> = {
  [DOCK_BOT_SELECT_SITE_ONBOARDING_CALLBACK]: {
    path: DOCK_ONBOARDING_CALLBACK_PATH,
    productionOrigin: "https://api.dock.surf",
  },
};

export type ParsedDockBotSelectClientParam = {
  providerId: string;
  callbackSlug: string;
  localPort?: number;
};

export function buildUnsignedDockBotSelectHandoffSearchParams(args: {
  callbackSlug: string;
  localPort?: number;
  providerId?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set(DOCK_BOT_SELECT_CLIENT_PARAM, formatDockBotSelectClientParam(args));
  return params;
}

/** Derives `client=dock.siteonboarding` or `dock.siteonboarding.local.3001` from Dock `SITE_URL`. */
export function formatDockOnboardingBotSelectClientParam(siteUrl?: string): string {
  const trimmed = siteUrl?.trim().replace(/\/$/, "");
  if (trimmed) {
    try {
      const url = new URL(trimmed);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return formatDockBotSelectClientParam({
          callbackSlug: DOCK_BOT_SELECT_SITE_ONBOARDING_CALLBACK,
          localPort: DOCK_BOT_SELECT_LOCAL_DEV_PORT,
        });
      }
    } catch {
      // fall through to production client param
    }
  }
  return formatDockBotSelectClientParam({
    callbackSlug: DOCK_BOT_SELECT_SITE_ONBOARDING_CALLBACK,
  });
}

export function formatDockBotSelectClientParam(args: {
  callbackSlug: string;
  localPort?: number;
  providerId?: string;
}): string {
  const providerId = args.providerId ?? DOCK_BOT_SELECT_CLIENT_ID;
  if (args.localPort !== undefined) {
    return `${providerId}.${args.callbackSlug}${DOCK_BOT_SELECT_LOCAL_SUFFIX}${args.localPort}`;
  }
  return `${providerId}.${args.callbackSlug}`;
}

/** Parses `dock.siteonboarding` or `dock.siteonboarding.local.3000`. */
export function parseDockBotSelectClientParam(raw: string): ParsedDockBotSelectClientParam | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const localIdx = trimmed.lastIndexOf(DOCK_BOT_SELECT_LOCAL_SUFFIX);
  if (localIdx !== -1) {
    const beforeLocal = trimmed.slice(0, localIdx);
    const portRaw = trimmed.slice(localIdx + DOCK_BOT_SELECT_LOCAL_SUFFIX.length);
    if (!portRaw || !/^\d+$/.test(portRaw)) {
      return null;
    }
    const localPort = Number.parseInt(portRaw, 10);
    if (!Number.isFinite(localPort) || localPort < 1 || localPort > 65535) {
      return null;
    }
    const parts = beforeLocal.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return null;
    }
    return { providerId: parts[0], callbackSlug: parts[1], localPort };
  }

  const parts = trimmed.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { providerId: parts[0], callbackSlug: parts[1] };
}

export function resolveDockBotSelectReturnUrlFromClientParam(clientParam: string): string | null {
  const parsed = parseDockBotSelectClientParam(clientParam);
  if (!parsed || parsed.providerId !== DOCK_BOT_SELECT_CLIENT_ID) {
    return null;
  }

  const callback = DOCK_BOT_SELECT_CALLBACKS[parsed.callbackSlug];
  if (!callback) {
    return null;
  }

  if (parsed.localPort !== undefined) {
    const returnUrl = `http://localhost:${parsed.localPort}${callback.path}`;
    return isDockOnboardingBotSelectCallbackUrl(returnUrl) ? returnUrl : null;
  }

  const returnUrl = `${callback.productionOrigin}${callback.path}`;
  return isAllowedDockBotSelectReturnUrl(returnUrl) ? returnUrl : null;
}

export function dockBotSelectSignaturePayload(args: {
  clientId: string;
  returnUrl: string;
  timestampSeconds: number;
}): string {
  return `${DOCK_BOT_SELECT_SIGNATURE_VERSION}\n${args.clientId}\n${args.returnUrl}\n${args.timestampSeconds}`;
}

function isDockProductHandoffHostname(hostname: string): boolean {
  const h = hostname.split(":")[0].toLowerCase();
  return h === "dock.surf" || h.endsWith(".dock.surf");
}

/** Return URLs Meridian accepts for Dock `/select` handoffs. */
export function isAllowedDockBotSelectReturnUrl(returnUrl: string): boolean {
  if (isDockOnboardingBotSelectCallbackUrl(returnUrl)) {
    return true;
  }
  try {
    const url = new URL(returnUrl);
    return url.protocol === "https:" && isDockProductHandoffHostname(url.hostname);
  } catch {
    return false;
  }
}

export function isDockOnboardingBotSelectCallbackUrl(returnUrl: string): boolean {
  try {
    const url = new URL(returnUrl);
    if (url.pathname !== DOCK_ONBOARDING_CALLBACK_PATH) {
      return false;
    }
    const host = url.hostname.toLowerCase();
    if (host === "api.dock.surf") {
      return url.protocol === "https:";
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return url.protocol === "http:";
    }
    return false;
  } catch {
    return false;
  }
}

function resolveLegacyDockBotSelectReturnUrl(
  searchParams: Pick<URLSearchParams, "get">,
): string | null {
  const clientId = searchParams.get(DOCK_BOT_SELECT_CLIENT_PARAM)?.trim() ?? "";
  const returnUrl = searchParams.get(DOCK_BOT_SELECT_RETURN_PARAM)?.trim() ?? "";
  if (clientId !== DOCK_BOT_SELECT_CLIENT_ID || !returnUrl) {
    return null;
  }
  return isAllowedDockBotSelectReturnUrl(returnUrl) ? returnUrl : null;
}

export function resolveDockBotSelectHandoffReturnFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): string | null {
  const clientParam = searchParams.get(DOCK_BOT_SELECT_CLIENT_PARAM)?.trim() ?? "";
  if (!clientParam) {
    return null;
  }

  const fromClientParam = resolveDockBotSelectReturnUrlFromClientParam(clientParam);
  if (fromClientParam) {
    return fromClientParam;
  }

  return resolveLegacyDockBotSelectReturnUrl(searchParams);
}

export function isDockBotSelectHandoffAttempt(
  searchParams: Pick<URLSearchParams, "get">,
): boolean {
  const clientParam = searchParams.get(DOCK_BOT_SELECT_CLIENT_PARAM)?.trim() ?? "";
  if (!clientParam) {
    return false;
  }
  const parsed = parseDockBotSelectClientParam(clientParam);
  if (parsed?.providerId === DOCK_BOT_SELECT_CLIENT_ID) {
    return true;
  }
  return clientParam === DOCK_BOT_SELECT_CLIENT_ID;
}

export function signDockBotSelectHandoff(args: {
  secret: string;
  returnUrl: string;
  clientId?: string;
  timestampSeconds?: number;
}): {
  clientId: string;
  returnUrl: string;
  timestampSeconds: number;
  signature: string;
} {
  const clientId = args.clientId ?? DOCK_BOT_SELECT_CLIENT_ID;
  const timestampSeconds = args.timestampSeconds ?? Math.floor(Date.now() / 1000);
  const payload = dockBotSelectSignaturePayload({
    clientId,
    returnUrl: args.returnUrl,
    timestampSeconds,
  });
  const signature = createHmac("sha256", args.secret)
    .update(payload, "utf8")
    .digest("hex");
  return { clientId, returnUrl: args.returnUrl, timestampSeconds, signature };
}

export function buildDockBotSelectHandoffSearchParams(args: {
  secret: string;
  returnUrl: string;
  timestampSeconds?: number;
  /** When set, emitted as `client` instead of legacy `dock` + `return`. */
  clientParam?: string;
}): URLSearchParams {
  const signed = signDockBotSelectHandoff(args);
  const params = new URLSearchParams();
  if (args.clientParam) {
    params.set(DOCK_BOT_SELECT_CLIENT_PARAM, args.clientParam);
  } else {
    params.set(DOCK_BOT_SELECT_CLIENT_PARAM, signed.clientId);
    params.set(DOCK_BOT_SELECT_RETURN_PARAM, signed.returnUrl);
  }
  params.set(DOCK_BOT_SELECT_TIMESTAMP_PARAM, String(signed.timestampSeconds));
  params.set(DOCK_BOT_SELECT_SIGNATURE_PARAM, signed.signature);
  return params;
}

function timingSafeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
  } catch {
    return false;
  }
}

export function verifyDockBotSelectHandoff(args: {
  secret: string;
  clientId: string;
  returnUrl: string;
  timestampSeconds: number;
  signature: string;
  nowSeconds?: number;
}): boolean {
  if (args.clientId !== DOCK_BOT_SELECT_CLIENT_ID) {
    return false;
  }
  if (!isDockOnboardingBotSelectCallbackUrl(args.returnUrl)) {
    return false;
  }
  const nowSeconds = args.nowSeconds ?? Math.floor(Date.now() / 1000);
  const age = nowSeconds - args.timestampSeconds;
  if (age < 0 || age > DOCK_BOT_SELECT_MAX_AGE_SECONDS) {
    return false;
  }
  const expected = signDockBotSelectHandoff({
    secret: args.secret,
    returnUrl: args.returnUrl,
    clientId: args.clientId,
    timestampSeconds: args.timestampSeconds,
  });
  return timingSafeEqualHex(expected.signature, args.signature);
}

export type DockBotSelectHandoffParams = {
  clientId: string;
  returnUrl: string;
  timestampSeconds: number;
  signature: string;
};

export function readDockBotSelectHandoffParams(
  searchParams: Pick<URLSearchParams, "get">,
): DockBotSelectHandoffParams | null {
  const returnUrl = resolveDockBotSelectHandoffReturnFromSearchParams(searchParams);
  if (!returnUrl) {
    return null;
  }
  const timestampRaw = searchParams.get(DOCK_BOT_SELECT_TIMESTAMP_PARAM)?.trim() ?? "";
  const signature = searchParams.get(DOCK_BOT_SELECT_SIGNATURE_PARAM)?.trim() ?? "";
  if (!timestampRaw || !signature) {
    return null;
  }
  const timestampSeconds = Number.parseInt(timestampRaw, 10);
  if (!Number.isFinite(timestampSeconds)) {
    return null;
  }
  return {
    clientId: DOCK_BOT_SELECT_CLIENT_ID,
    returnUrl,
    timestampSeconds,
    signature,
  };
}

export function verifyDockBotSelectHandoffFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
  secret: string,
  nowSeconds?: number,
): string | null {
  const returnUrl = resolveDockBotSelectHandoffReturnFromSearchParams(searchParams);
  if (!returnUrl) {
    return null;
  }

  const timestampRaw = searchParams.get(DOCK_BOT_SELECT_TIMESTAMP_PARAM)?.trim() ?? "";
  const signature = searchParams.get(DOCK_BOT_SELECT_SIGNATURE_PARAM)?.trim() ?? "";
  const hasSignedParams = Boolean(timestampRaw || signature);

  if (!hasSignedParams) {
    return returnUrl;
  }

  const params = readDockBotSelectHandoffParams(searchParams);
  if (!params || !secret.trim()) {
    return null;
  }
  const valid = verifyDockBotSelectHandoff({
    secret,
    ...params,
    nowSeconds,
  });
  return valid ? params.returnUrl : null;
}
