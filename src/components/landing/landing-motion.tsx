"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { type ReactNode, useRef } from "react";

gsap.registerPlugin(useGSAP);

export function LandingMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          allowMotion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);
          const root = rootRef.current;
          if (!root) return;
          const hero = gsap.utils.toArray<HTMLElement>(
            "[data-landing-reveal='hero']",
            root,
          );
          const sections = gsap.utils.toArray<HTMLElement>(
            "[data-landing-reveal='section']",
            root,
          );

          if (reduceMotion) {
            gsap.set([...hero, ...sections], { autoAlpha: 1, y: 0 });
            return;
          }

          gsap.set(hero, { autoAlpha: 0, y: 16 });
          gsap.to(hero, {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.1,
            ease: "power2.out",
            delay: 0.05,
          });

          gsap.set(sections, { autoAlpha: 0, y: 20 });
          const observer = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                gsap.to(entry.target, {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.7,
                  ease: "power2.out",
                });
                observer.unobserve(entry.target);
              }
            },
            { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
          );
          for (const section of sections) observer.observe(section);
          return () => observer.disconnect();
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="flex min-h-full flex-1 flex-col">
      {children}
    </div>
  );
}
