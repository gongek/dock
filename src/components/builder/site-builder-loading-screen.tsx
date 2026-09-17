"use client";

import { useEffect, useRef, useState } from "react";

const DOT_CYCLE = [0, 1, 2, 3, 2, 1] as const;
const DOT_INTERVAL_MS = 250;
const DOTS_PAUSE_MS = 300;

export function SiteBuilderLoadingScreen({
  visible = true,
  fadeMs = 400,
  completionRequested = false,
  onComplete,
}: {
  visible?: boolean;
  fadeMs?: number;
  completionRequested?: boolean;
  onComplete?: () => void;
}) {
  const [dotStep, setDotStep] = useState(0);
  const [lockedAtDots, setLockedAtDots] = useState(false);
  const completionStartedRef = useRef(false);

  useEffect(() => {
    if (lockedAtDots) return;

    const intervalId = window.setInterval(() => {
      setDotStep((current) => (current + 1) % DOT_CYCLE.length);
    }, DOT_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [lockedAtDots]);

  useEffect(() => {
    if (!completionRequested || completionStartedRef.current) return;
    if (DOT_CYCLE[dotStep] !== 3) return;

    completionStartedRef.current = true;
    setLockedAtDots(true);

    const dotsPauseTimeoutId = window.setTimeout(() => onComplete?.(), DOTS_PAUSE_MS);

    return () => window.clearTimeout(dotsPauseTimeoutId);
  }, [completionRequested, dotStep, onComplete]);

  const dots = lockedAtDots ? "..." : ".".repeat(DOT_CYCLE[dotStep]!);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#090909] transition-opacity ease-out ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ transitionDuration: `${fadeMs}ms` }}
    >
      <p className="m-0 whitespace-nowrap text-base font-medium tracking-wide text-zinc-100">
        Loading your content
        <span className="text-zinc-300">{dots}</span>
      </p>
    </div>
  );
}
