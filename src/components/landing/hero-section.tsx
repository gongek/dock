import Link from "next/link";
import { LandingAtmosphere } from "@/components/landing/landing-atmosphere";
import { LandingProductPreview } from "@/components/landing/landing-product-preview";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center px-6 pt-24 pb-16">
      <LandingAtmosphere />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div>
          <h1
            data-landing-reveal="hero"
            className="max-w-3xl text-4xl font-medium tracking-tight text-zinc-100 sm:text-7xl sm:leading-[1.05]"
          >
            A site for your Meridian bot
          </h1>
          <p
            data-landing-reveal="hero"
            className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-xl sm:leading-8"
          >
            Your bot already runs the Discord server. Dock is the website around
            it, where staff handle cases and users can actually find appeals,
            tickets, and rules.
          </p>
          <div
            data-landing-reveal="hero"
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Link href="/login" className="landing-btn-primary">
              Get started
            </Link>
            <Link href="/premium" className="landing-btn-secondary">
              See plans
            </Link>
          </div>
        </div>
        <div data-landing-reveal="hero">
          <LandingProductPreview />
        </div>
      </div>
    </section>
  );
}
