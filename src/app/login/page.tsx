import type { Metadata } from "next";
import { LoginPage } from "@/components/login-page";

export const metadata: Metadata = {
  title: "Log in | Dock",
  description: "Log in to Dock with Meridian",
};

export default function Login() {
  return <LoginPage />;
}
