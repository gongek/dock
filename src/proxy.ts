import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

function isConvexAuthHttpPath(pathname: string) {
  return (
    pathname === "/callback/meridian" ||
    pathname.startsWith("/api/auth/signin/") ||
    pathname.startsWith("/api/auth/callback/")
  );
}

const isLoginPage = createRouteMatcher(["/login"]);
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

const proxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isLoginPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
}, {
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
