import type { Metadata } from "next";
import { LoginPage } from "@/components/login-page";

export const metadata: Metadata = {
  title: "Log in | Dock",
  description: "Log in to Dock with Meridian",
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const { returnTo, error } = await searchParams;
  return <LoginPage returnTo={returnTo} error={error} />;
}
