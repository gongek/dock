import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

function createCallbackForwarder(provider: string) {
  return httpAction(async (_ctx, request) => {
    const incoming = new URL(request.url);
    const target = new URL(
      `${process.env.CONVEX_SITE_URL}/api/auth/callback/${provider}`,
    );
    target.search = incoming.search;

    const headers = new Headers(request.headers);
    headers.delete("host");

    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.arrayBuffer(),
      redirect: "manual",
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  });
}

for (const provider of ["meridian", "discord"] as const) {
  http.route({
    path: `/callback/${provider}`,
    method: "GET",
    handler: createCallbackForwarder(provider),
  });

  http.route({
    path: `/callback/${provider}`,
    method: "POST",
    handler: createCallbackForwarder(provider),
  });
}

export default http;
