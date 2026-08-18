import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

const forwardMeridianCallback = httpAction(async (_ctx, request) => {
  const incoming = new URL(request.url);
  const target = new URL(
    `${process.env.CONVEX_SITE_URL}/api/auth/callback/meridian`,
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

http.route({
  path: "/callback/meridian",
  method: "GET",
  handler: forwardMeridianCallback,
});

http.route({
  path: "/callback/meridian",
  method: "POST",
  handler: forwardMeridianCallback,
});

export default http;
