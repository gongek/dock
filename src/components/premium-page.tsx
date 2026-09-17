import Link from "next/link";
import { DockLogo } from "@/components/dock-logo";
import { SiteFooter } from "@/components/site-footer";
import { PRICING_TIERS } from "@/lib/pricing";

export function PremiumPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center px-6 py-12">
        <DockLogo className="h-auto w-40" />
        <div className="mt-8 flex w-full max-w-4xl flex-col items-center gap-8 text-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-sm font-medium tracking-wide text-zinc-200">
              Plans
            </h1>
            <p className="text-xs text-zinc-500">
              Build a dashboard for your Meridian bot.
            </p>
          </div>

          <div className="grid w-full gap-4 text-left md:grid-cols-3">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`flex flex-col rounded-xl border bg-zinc-950 p-5 ${
                  tier.highlighted
                    ? "border-zinc-600 ring-1 ring-zinc-600/50"
                    : "border-zinc-800"
                }`}
              >
                <p className="text-sm font-medium text-zinc-200">{tier.name}</p>
                <p className="mt-2 text-lg font-medium text-zinc-100">
                  {tier.priceLabel}
                </p>
                {tier.priceNote ? (
                  <p className="mt-1 text-xs text-zinc-500">{tier.priceNote}</p>
                ) : null}
                <ul className="mt-4 flex flex-1 flex-col gap-2 text-xs leading-5 text-zinc-500">
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link
                  href={tier.cta.href}
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
                >
                  {tier.cta.label}
                </Link>
              </div>
            ))}
          </div>

          <p className="max-w-lg text-xs leading-5 text-zinc-600">
            Meridian Max includes Dock Lite. Meridian Max users get 50% off Dock
            Pro.
          </p>
        </div>
      </div>
      <SiteFooter leading={{ label: "Pricing", href: "/premium" }} />
    </div>
  );
}
