"use client";

import { motion } from "framer-motion";
import { RefObject, useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedBeamProps {
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  curvature?: number;
  orientation?: "horizontal" | "vertical";
  reverse?: boolean;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  delay?: number;
  duration?: number;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
  animatedLabel?: string;
}

export const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  orientation = "horizontal",
  reverse = false,
  duration = 5,
  delay = 0,
  pathColor = "gray",
  pathWidth = 2,
  pathOpacity = 0.2,
  gradientStartColor = "#ffaa40",
  gradientStopColor = "#9c40ff",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
  animatedLabel,
}) => {
  const id = useId();
  const [pathD, setPathD] = useState("");
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  const gradientCoordinates = orientation === "vertical"
    ? reverse
      ? { x1: ["0%", "0%"], x2: ["0%", "0%"], y1: ["90%", "-10%"], y2: ["100%", "0%"] }
      : { x1: ["0%", "0%"], x2: ["0%", "0%"], y1: ["10%", "110%"], y2: ["0%", "100%"] }
    : reverse
      ? { x1: ["90%", "-10%"], x2: ["100%", "0%"], y1: ["0%", "0%"], y2: ["0%", "0%"] }
      : { x1: ["10%", "110%"], x2: ["0%", "100%"], y1: ["0%", "0%"], y2: ["0%", "0%"] };

  useEffect(() => {
    const updatePath = () => {
      if (containerRef.current && fromRef.current && toRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const rectA = fromRef.current.getBoundingClientRect();
        const rectB = toRef.current.getBoundingClientRect();
        setSvgDimensions({ width: containerRect.width, height: containerRect.height });

        const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
        const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
        const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
        const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset;
        const controlX = orientation === "vertical" ? startX - curvature : (startX + endX) / 2;
        const controlY = orientation === "vertical" ? (startY + endY) / 2 : startY - curvature;
        setPathD(`M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`);
      }
    };

    let animationFrame = 0;
    const scheduleUpdate = () => {
      updatePath();
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updatePath);
    };
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    [containerRef.current, fromRef.current, toRef.current].forEach((element) => {
      if (element) resizeObserver.observe(element);
    });
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();
    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [containerRef, fromRef, toRef, curvature, orientation, startXOffset, startYOffset, endXOffset, endYOffset]);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none absolute left-0 top-0 transform-gpu stroke-2 motion-reduce:hidden", className)}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
    >
      <path id={`${id}-motion-path`} d={pathD} stroke={pathColor} strokeWidth={pathWidth} strokeOpacity={pathOpacity} strokeLinecap="round" />
      <path d={pathD} strokeWidth={pathWidth} stroke={`url(#${id})`} strokeOpacity="1" strokeLinecap="round" />
      {animatedLabel ? (
        <text
          fill="var(--red)"
          stroke="var(--surface)"
          strokeWidth="3"
          paintOrder="stroke"
          fontSize="11"
          fontWeight="700"
          fontFamily="var(--font-code)"
        >
          <textPath href={`#${id}-motion-path`} startOffset="0%">
            {animatedLabel}
            <animate attributeName="startOffset" from="0%" to="94%" dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" />
          </textPath>
        </text>
      ) : null}
      <defs>
        <motion.linearGradient
          className="transform-gpu"
          id={id}
          gradientUnits="userSpaceOnUse"
          initial={{ x1: "0%", x2: "0%", y1: "0%", y2: "0%" }}
          animate={{ x1: gradientCoordinates.x1, x2: gradientCoordinates.x2, y1: gradientCoordinates.y1, y2: gradientCoordinates.y2 }}
          transition={{ delay, duration, ease: "linear", repeat: Infinity, repeatDelay: 0 }}
        >
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop stopColor={gradientStartColor} />
          <stop offset="32.5%" stopColor={gradientStopColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};
