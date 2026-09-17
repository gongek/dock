"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DockBrand } from "@/components/dashboard/dock-brand";

const SCROLL_RANGE = 220;
const SMOOTHING = 0.12;
const PROGRESS_EPSILON = 0.001;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function smoothstep(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

function targetScrollProgress(scrollY: number) {
  return smoothstep(clamp01(scrollY / SCROLL_RANGE));
}

function useSmoothScrollProgress() {
  const [metrics, setMetrics] = useState({
    progress: 0,
    isSm: false,
  });

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let current = 0;
    let lastRendered = -1;
    let lastIsSm = window.innerWidth >= 640;

    const tick = () => {
      const target = targetScrollProgress(window.scrollY);
      const isSm = window.innerWidth >= 640;

      if (reduceMotion) {
        current = target;
      } else {
        current += (target - current) * SMOOTHING;
        if (Math.abs(target - current) < PROGRESS_EPSILON) {
          current = target;
        }
      }

      if (
        Math.abs(current - lastRendered) > PROGRESS_EPSILON ||
        isSm !== lastIsSm
      ) {
        lastRendered = current;
        lastIsSm = isSm;
        setMetrics({ progress: current, isSm });
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return metrics;
}

export function LandingNav() {
  const { progress, isSm } = useSmoothScrollProgress();
  const height = lerp(isSm ? 56 : 48, isSm ? 44 : 40, progress);
  const maxWidth = lerp(isSm ? 1152 : 576, isSm ? 672 : 576, progress);
  const paddingX = lerp(isSm ? 20 : 12, isSm ? 12 : 8, progress);
  const top = lerp(16, 8, progress);
  const navGap = lerp(isSm ? 20 : 8, isSm ? 12 : 6, progress);
  const buttonPaddingX = lerp(14, 10, progress);
  const buttonPaddingY = lerp(6, 4, progress);
  const buttonFontSize = lerp(14, 13, progress);

  return (
    <header
      className="pointer-events-none fixed inset-x-0 z-50 px-4"
      style={{ top }}
    >
      <div
        className="pointer-events-auto mx-auto flex w-full items-center justify-between rounded-full border border-white/[0.08] bg-[#090909]/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md will-change-[height,max-width,padding]"
        style={{
          height,
          maxWidth,
          paddingLeft: paddingX,
          paddingRight: paddingX,
        }}
      >
        <DockBrand href="/" shrinkProgress={progress} />
        <nav className="flex items-center" style={{ gap: navGap }}>
          <Link
            href="/premium"
            className="hidden text-sm text-zinc-400 transition-colors hover:text-zinc-200 sm:inline"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="landing-btn-primary landing-btn-nav"
            style={{
              paddingInline: buttonPaddingX,
              paddingBlock: buttonPaddingY,
              fontSize: buttonFontSize,
            }}
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
