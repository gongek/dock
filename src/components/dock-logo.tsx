"use client";

import { ShaderMount } from "@paper-design/shaders-react";
import {
  GemSmokeShapes,
  ShaderFitOptions,
  gemSmokeFragmentShader,
  getShaderColorFromString,
} from "@paper-design/shaders";
import { useEffect, useMemo, useRef, useState } from "react";

const PROCESSED_LOGO = "/dock-logo-gem-smoke.png";

const WEBGL_ATTRIBUTES = {
  alpha: false,
  preserveDrawingBuffer: true,
};

function normalizeLogoClassName(className?: string) {
  return (className ?? "w-56")
    .split(/\s+/)
    .filter((token) => token && token !== "h-auto")
    .join(" ");
}

function sampleHasLogo(imageData: ImageData) {
  const { data, width, height } = imageData;
  let bright = 0;
  const step = 8;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i] + data[i + 1] + data[i + 2] > 80) bright += 1;
    }
  }
  return bright > 12;
}

export function DockLogo({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [textureReady, setTextureReady] = useState(false);
  const [shaderReady, setShaderReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setTextureReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setTextureReady(false);
    };
    img.src = PROCESSED_LOGO;

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  useEffect(() => {
    if (!textureReady) return;

    let raf = 0;
    let readyFrames = 0;

    const tick = () => {
      const canvas = rootRef.current?.querySelector<HTMLCanvasElement>("canvas");
      if (canvas && canvas.width > 1 && canvas.height > 1) {
        const probe = document.createElement("canvas");
        probe.width = canvas.width;
        probe.height = canvas.height;
        const ctx = probe.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, 0);
          if (sampleHasLogo(ctx.getImageData(0, 0, probe.width, probe.height))) {
            readyFrames += 1;
            if (readyFrames >= 3) setShaderReady(true);
          } else {
            readyFrames = 0;
          }
        }
      }
      if (readyFrames < 3) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [textureReady]);

  const uniforms = useMemo(
    () => ({
      u_colors: ["#8fd0ff", "#61bdff", "#ffffff"].map(getShaderColorFromString),
      u_colorsCount: 3,
      u_colorBack: getShaderColorFromString("#090909"),
      u_image: PROCESSED_LOGO,
      u_innerDistortion: 1,
      u_outerDistortion: 0.8,
      u_outerGlow: 0,
      u_innerGlow: 1,
      u_colorInner: getShaderColorFromString("#121212"),
      u_offset: 0,
      u_angle: 0,
      u_size: 0.8,
      u_isImage: true,
      u_shape: GemSmokeShapes.none,
      u_fit: ShaderFitOptions.contain,
      u_scale: 1,
      u_rotation: 0,
      u_offsetX: 0,
      u_offsetY: 0,
      u_originX: 0.5,
      u_originY: 0.5,
      u_worldWidth: 0,
      u_worldHeight: 0,
    }),
    [],
  );

  const logoClassName = normalizeLogoClassName(className);
  const showFallback = !shaderReady;

  return (
    <div className={`relative h-56 w-56 ${logoClassName}`}>
      {showFallback ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/dock-logo.svg"
          alt=""
          aria-hidden
          width={224}
          height={224}
          decoding="sync"
          fetchPriority="high"
          className="absolute inset-0 size-full object-contain"
        />
      ) : null}
      {mounted && textureReady ? (
        <div
          ref={rootRef}
          className={`dock-logo-shader absolute inset-0 overflow-hidden ${
            shaderReady ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={!shaderReady}
        >
          <ShaderMount
            width="100%"
            height="100%"
            speed={1}
            minPixelRatio={1}
            fragmentShader={gemSmokeFragmentShader}
            mipmaps={["u_image"]}
            webGlContextAttributes={WEBGL_ATTRIBUTES}
            uniforms={uniforms}
          />
        </div>
      ) : null}
    </div>
  );
}
