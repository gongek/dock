import { proxyConvexHttp } from "@/lib/convex-http-proxy";

export function GET(request: Request) {
  return proxyConvexHttp(request, "/callback/discord", "discord");
}

export function POST(request: Request) {
  return proxyConvexHttp(request, "/callback/discord", "discord");
}
