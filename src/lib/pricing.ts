import type { OwnerPlan } from "../../convex/lib/siteLimits";

export function formatDockPlanLabel(plan: OwnerPlan): string {
  switch (plan) {
    case "hobby":
      return "Dock Lite";
    case "pro":
    case "max":
    case "enterprise":
      return "Dock Pro";
    default:
      return "Dock Free";
  }
}

export type PricingTier = {
  id: "free" | "lite" | "pro";
  name: string;
  priceLabel: string;
  priceNote?: string;
  highlighted?: boolean;
  features: string[];
  cta: { label: string; href: string };
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Dock Free",
    priceLabel: "Free",
    priceNote: "For bot admins only",
    features: [
      "For bot admins only",
      "Included subdomain",
      "Visual site builder",
      "Discord sign-in for staff",
      "Dock branding on published sites",
    ],
    cta: { label: "Get started", href: "/login" },
  },
  {
    id: "lite",
    name: "Dock Lite",
    priceLabel: "€5.99 / mo",
    priceNote: "Included with Meridian Max",
    highlighted: true,
    features: [
      "Everything in Dock Free",
      "3 sites",
      "Free subdomain",
      "Hide Dock branding",
      "Public publishing",
      "Custom slug sites",
    ],
    cta: { label: "Upgrade", href: "/upgrade/lite" },
  },
  {
    id: "pro",
    name: "Dock Pro",
    priceLabel: "€9.99 / mo",
    priceNote: "50% off for Meridian Max users (€4.99 / mo)",
    features: [
      "Everything in Dock Lite",
      "Unlimited sites",
      "Custom domain support",
      "All upcoming Pro features",
    ],
    cta: { label: "Upgrade", href: "/upgrade/pro" },
  },
];
