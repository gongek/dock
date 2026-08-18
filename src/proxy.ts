import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

const proxy = convexAuthNextjsMiddleware(undefined, {
  cookieConfig: { maxAge: 60 * 60 * 24 * 30 },
});

export default proxy;
export { proxy };

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
