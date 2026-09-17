const DEFAULT_FALLBACK = "Something went wrong. Please try again.";

const CONVEX_WRAPPER =
  /\[CONVEX\b|\bRequest ID:|\bServer Error\b|\bUncaught (?:Convex)?Error:|\bArgumentValidationError\b|\bCould not find public function\b|\bat handler\b|\bconvex\/[^\s]+\.(ts|js)/i;

function extractRawMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data: unknown }).data;
    if (typeof data === "string" && data.trim()) {
      return data;
    }
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      return data.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "";
}

function unwrapConvexMessage(message: string): string {
  const nested = message.match(/Uncaught (?:Convex)?Error:\s*([\s\S]+)/);
  if (nested?.[1]) {
    return nested[1].trim();
  }
  return message.trim();
}

function looksLikeConvexInternal(message: string): boolean {
  return (
    CONVEX_WRAPPER.test(message) ||
    /\bAUTH_[A-Z0-9_]+\b/.test(message) ||
    /\bprocess\.env\b/.test(message)
  );
}

export function userFacingError(
  error: unknown,
  fallback: string = DEFAULT_FALLBACK,
): string {
  const unwrapped = unwrapConvexMessage(extractRawMessage(error));
  const firstLine = unwrapped.split("\n")[0]?.trim() ?? "";
  if (!firstLine || looksLikeConvexInternal(firstLine)) {
    return fallback;
  }
  return firstLine;
}
