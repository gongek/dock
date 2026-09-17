"use client";

import { DockLogo } from "@/components/dock-logo";
import { useEffect, useRef, useSyncExternalStore } from "react";

const COMPACT_WASH_PARALLAX = 28;
const SUBTLE_WASH_PARALLAX = 10;
const WASH_SMOOTHING = 0.025;
const WASH_EPSILON = 0.05;

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LandingAtmosphere({
  compact = false,
  subtle = false,
}: {
  compact?: boolean;
  subtle?: boolean;
}) {
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const washRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!compact || reduceMotion) return;

    const wash = washRef.current;
    const section = wash?.closest("section");
    if (!wash || !section) return;

    const current = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let frame = 0;
    let tracking = false;

    const setOffset = (x: number, y: number) => {
      wash.style.setProperty("--wash-x", `${x}px`);
      wash.style.setProperty("--wash-y", `${y}px`);
    };

    const tick = () => {
      current.x += (target.x - current.x) * WASH_SMOOTHING;
      current.y += (target.y - current.y) * WASH_SMOOTHING;
      setOffset(current.x, current.y);

      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const settling =
        !tracking && dx * dx + dy * dy <= WASH_EPSILON * WASH_EPSILON;

      if (settling) {
        current.x = target.x;
        current.y = target.y;
        setOffset(current.x, current.y);
        frame = 0;
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    const startTick = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(tick);
      }
    };

    const onMove = (event: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const nx = (event.clientX - centerX) / rect.width;
      const ny = (event.clientY - centerY) / rect.height;
      tracking = true;
      const parallax = subtle ? SUBTLE_WASH_PARALLAX : COMPACT_WASH_PARALLAX;
      target.x = nx * parallax * 2;
      target.y = ny * parallax * 2;
      startTick();
    };

    const onLeaveWindow = () => {
      tracking = false;
      target.x = 0;
      target.y = 0;
      startTick();
    };

    window.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeaveWindow);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeaveWindow);
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      setOffset(0, 0);
    };
  }, [compact, reduceMotion, subtle]);

  return (
    <div className="landing-atmosphere" aria-hidden>
      <div
        ref={washRef}
        className={
          compact
            ? `landing-atmosphere-wash landing-atmosphere-wash--compact${subtle ? " landing-atmosphere-wash--subtle" : ""}`
            : "landing-atmosphere-wash"
        }
      />
      {compact ? null : (
        <div className="absolute top-[-8%] left-1/2 -translate-x-1/2 scale-[2.1] opacity-30 blur-md">
          {reduceMotion ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/dock-logo.svg"
              alt=""
              width={224}
              height={224}
              className="size-56 object-contain"
            />
          ) : (
            <DockLogo />
          )}
        </div>
      )}
    </div>
  );
}
