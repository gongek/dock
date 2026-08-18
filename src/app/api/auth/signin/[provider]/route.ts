import { proxyConvexHttp } from "@/lib/convex-http-proxy";

const PROVIDER_ID = /^[\w-]+$/;

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!PROVIDER_ID.test(provider)) {
    return new Response("Not found", { status: 404 });
  }
  return proxyConvexHttp(request, `/api/auth/signin/${provider}`);
}
