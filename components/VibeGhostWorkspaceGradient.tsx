"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { getVibeGhostWorkspaceGradient, hashToVibeGhostSeeds } from "@/lib/vibeghost-workspace-gradient";

export function VibeGhostWorkspaceGradient({
  seed,
  accentColor,
  className,
}: {
  seed: string;
  accentColor?: string;
  className?: string;
}) {
  const { colors, seeds } = getVibeGhostWorkspaceGradient(seed, accentColor);
  const uidSeed = accentColor ? `${seed}:${accentColor}` : seed;
  const uid = `marketplace-workspace-gradient-${hashToVibeGhostSeeds(uidSeed, 2)
    .map((value) => Math.floor(value * 1_000_000).toString(36))
    .join("-")}`;
  const clipId = `${uid}-clip`;
  const gradientAId = `${uid}-gradient-a`;
  const gradientBId = `${uid}-gradient-b`;
  const gradientStyle = {
    "--workspace-gradient-source-0": colors[0],
    "--workspace-gradient-source-1": colors[1],
    "--workspace-gradient-source-2": colors[2],
    "--workspace-gradient-source-3": colors[3],
  } as CSSProperties;

  return (
    <svg
      aria-hidden="true"
      className={cn("vibeghost-workspace-gradient aspect-square shrink-0", className)}
      style={gradientStyle}
      viewBox="0 0 100 100"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M50 4A46 46 0 1 1 49.99 4Z" />
        </clipPath>
        <radialGradient
          id={gradientAId}
          gradientUnits="userSpaceOnUse"
          cx={18 + seeds[0] * 64}
          cy={18 + seeds[1] * 64}
          r={54 + seeds[2] * 24}
        >
          <stop offset="0" stopColor="var(--workspace-gradient-1)" />
          <stop offset="0.58" stopColor="var(--workspace-gradient-2)" stopOpacity="0.82" />
          <stop offset="1" stopColor="var(--workspace-gradient-0)" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={gradientBId}
          gradientUnits="userSpaceOnUse"
          cx={18 + seeds[3] * 64}
          cy={18 + seeds[4] * 64}
          r={42 + seeds[5] * 22}
        >
          <stop offset="0" stopColor="var(--workspace-gradient-3)" stopOpacity="0.94" />
          <stop offset="1" stopColor="var(--workspace-gradient-0)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect width="100" height="100" fill="var(--workspace-gradient-0)" />
        <rect width="100" height="100" fill={`url(#${gradientAId})`} />
        <rect width="100" height="100" fill={`url(#${gradientBId})`} />
      </g>
    </svg>
  );
}
