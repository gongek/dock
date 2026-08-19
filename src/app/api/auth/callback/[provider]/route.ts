import { proxyConvexHttp } from "@/lib/convex-http-proxy";

const PROVIDER_ID = /^[\w-]+$/;

async function handle(
  request: Request,
  provider: string,
): Promise<Response> {
  if (!PROVIDER_ID.test(provider)) {
    return new Response("Not found", { status: 404 });
  }
  return proxyConvexHttp(request, `/api/auth/callback/${provider}`, provider);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  return handle(request, provider);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  return handle(request, provider);
}
