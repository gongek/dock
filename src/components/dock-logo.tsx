"use client";

import { GemSmoke } from "@paper-design/shaders-react";

export function DockLogo({ className }: { className?: string }) {
  return (
    <div className={`aspect-square w-56 ${className ?? ""}`}>
      <GemSmoke
        width="100%"
        height="100%"
        image="/dock-logo.svg"
        colors={["#8fd0ff", "#61bdff", "#ffffff"]}
        colorBack="#090909"
        colorInner="#121212"
        shape="none"
        innerDistortion={1}
        outerDistortion={0.8}
        outerGlow={0}
        innerGlow={1}
        offset={0}
        angle={0}
        size={0.8}
        speed={1}
        scale={0.6}
        fit="contain"
      />
    </div>
  );
}
