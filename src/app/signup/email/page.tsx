import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscordEmailSignupPage } from "@/components/discord-email-signup-page";

export const metadata: Metadata = {
  title: "Enter email | Dock",
  description: "Finish creating your Dock account",
};

export default function SignupEmailPage() {
  return (
    <Suspense fallback={null}>
      <DiscordEmailSignupPage />
    </Suspense>
  );
}
