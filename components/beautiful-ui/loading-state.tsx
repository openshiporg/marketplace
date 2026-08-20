"use client";

import { useEffect, useState } from "react";

const chevron = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return (column + Math.abs(row - 1)) * 90;
});

const orbitOrder = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, index) => {
  const position = orbitOrder.indexOf(index);
  return position === -1 ? null : position * 110;
});

const patterns: Record<string, { delays: (number | null)[]; duration: number; round: boolean }> = {
  Drive: { delays: chevron, duration: 650, round: false },
  Dots: { delays: chevron, duration: 650, round: true },
  Orbit: { delays: orbit, duration: 950, round: false },
};

function useElapsed() {
  const [deciseconds, setDeciseconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setDeciseconds(current => current + 1), 100);
    return () => window.clearInterval(timer);
  }, []);

  const total = deciseconds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export function LoadingState({
  label = "Thinking",
  variant = "Drive",
  showElapsed = true,
}: {
  label?: string;
  variant?: "Drive" | "Dots" | "Orbit";
  showElapsed?: boolean;
}) {
  const elapsed = useElapsed();
  const { delays, duration, round } = patterns[variant] ?? patterns.Drive;

  return (
    <div className="flex w-fit items-center gap-2.5" role="status" aria-live="polite">
      <span aria-hidden className="grid grid-cols-[repeat(3,4px)] gap-[1.5px]">
        {delays.map((delay, index) => (
          <span
            key={index}
            className={round ? "size-1 rounded-full bg-ink" : "size-1 rounded-[1px] bg-ink"}
            style={{
              opacity: delay === null ? 0.07 : 0.15,
              animation: delay === null ? "none" : `pixel-on ${duration}ms var(--ease-in-out) ${delay}ms infinite`,
            }}
          />
        ))}
      </span>
      <span
        className="bg-clip-text text-[13px] font-medium text-transparent"
        style={{
          backgroundImage: "linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)",
          backgroundSize: "200% 100%",
          animation: "shimmer-text 1.4s linear infinite",
        }}
      >
        {label}
      </span>
      {showElapsed && <span className="font-mono text-[12px] tabular-nums text-ink-3">{elapsed}</span>}
    </div>
  );
}
