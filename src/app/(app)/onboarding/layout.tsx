import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a site | Dock",
  description: "Set up a Dock site for your Meridian bot.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
