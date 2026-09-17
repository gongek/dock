import "boxicons/css/boxicons.min.css";
import { CtaSection } from "@/components/landing/cta-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HeroSection } from "@/components/landing/hero-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingMotion } from "@/components/landing/landing-motion";
import { LandingNav } from "@/components/landing/landing-nav";

export function HomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip">
      <LandingNav />
      <LandingMotion>
        <main className="flex-1">
          <HeroSection />
          <FeaturesSection />
          <CtaSection />
        </main>
        <LandingFooter />
      </LandingMotion>
    </div>
  );
}
