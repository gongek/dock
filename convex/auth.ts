import { convexAuth } from "@convex-dev/auth/server";
import Meridian from "./meridian";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Meridian],
});
