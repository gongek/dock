const HOP_BY_HOP_REQUEST_HEADERS = [
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

function convexSiteUrl(): string {
  const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!cloudUrl) {
    throw new Error("Missing environment variable `NEXT_PUBLIC_CONVEX_URL`");
  }
  return cloudUrl.replace(/\.cloud$/, ".site").replace(/\/$/, "");
}

export async function proxyConvexHttp(
  request: Request,
  convexPath: string,
): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(`${convexSiteUrl()}${convexPath}`);
  target.search = incoming.search;

  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_REQUEST_HEADERS) {
    headers.delete(header);
  }

  const response = await fetch(target, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
