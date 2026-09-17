import Link from "next/link";
import { LandingAtmosphere } from "@/components/landing/landing-atmosphere";

export function CtaSection() {
  return (
    <section
      className="relative px-6 py-24 sm:py-32"
      aria-labelledby="cta-heading"
    >
      <LandingAtmosphere compact />
      <div
        data-landing-reveal="section"
        className="relative z-10 mx-auto max-w-3xl text-center"
      >
        <h2
          id="cta-heading"
          className="text-3xl font-medium tracking-tight text-zinc-100 sm:text-5xl sm:leading-[1.1]"
        >
          Connect a bot and publish a first page
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-zinc-400">
          Sign in with Meridian, link a bot, and publish a first page.
        </p>
        <div className="mt-10">
          <Link href="/login" className="landing-btn-primary">
            Get started
          </Link>
        </div>
      </div>
    </section>
  );
}
