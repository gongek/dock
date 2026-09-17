import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Legal | Dock",
  description: "Legal information for Dock by Meridian.",
};

export default function Legal() {
  return <LegalPage />;
}
