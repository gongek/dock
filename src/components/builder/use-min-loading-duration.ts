"use client";

import { useEffect, useRef, useState } from "react";

const MIN_LOADING_MS = 1200;
const MAX_LOADING_MS = 3000;

function randomLoadingDurationMs() {
  return (
    MIN_LOADING_MS +
    Math.floor(Math.random() * (MAX_LOADING_MS - MIN_LOADING_MS + 1))
  );
}

export function useFakeLoadingDuration() {
  const targetMsRef = useRef(randomLoadingDurationMs());
  const startMsRef = useRef(Date.now());
  const [elapsedEnough, setElapsedEnough] = useState(false);

  useEffect(() => {
    const remaining = targetMsRef.current - (Date.now() - startMsRef.current);
    if (remaining <= 0) {
      setElapsedEnough(true);
      return;
    }

    const timeoutId = window.setTimeout(() => setElapsedEnough(true), remaining);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return elapsedEnough;
}
