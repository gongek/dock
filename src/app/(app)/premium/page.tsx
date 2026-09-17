import type { Metadata } from "next";
import { PremiumPage } from "@/components/premium-page";

export const metadata: Metadata = {
  title: "Plans | Dock",
  description: "Dock Free, Dock Lite, and Dock Pro",
};

export default function Premium() {
  return <PremiumPage />;
}
