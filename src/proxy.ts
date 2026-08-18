import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

function isConvexAuthHttpPath(pathname: string) {
  return (
    pathname === "/callback/meridian" ||
    pathname.startsWith("/api/auth/signin/") ||
    pathname.startsWith("/api/auth/callback/")
  );
}

const proxy = convexAuthNextjsMiddleware(undefined, {
  cookieConfig: { maxAge: 60 * 60 * 24 * 30 },
  shouldHandleCode(request) {
    return !isConvexAuthHttpPath(new URL(request.url).pathname);
  },
});

export default proxy;
export { proxy };

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
