import type { Metadata } from "next";
import { SignInPage } from "@/components/sign-in-page";

export const metadata: Metadata = {
  title: "Sign in | Dock",
  description: "Sign in to Dock with Meridian",
};

export default function SignIn() {
  return <SignInPage />;
}
