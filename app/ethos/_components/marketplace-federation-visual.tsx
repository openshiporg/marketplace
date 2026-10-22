"use client";

import { forwardRef, useRef, useState } from "react";
import { Bike, Circle as CircleIcon, Droplets } from "lucide-react";

import { VibeGhostWorkspaceGradient } from "@/components/VibeGhostWorkspaceGradient";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function LineItem({
  icon,
  title,
  sku,
  iconOnly = false,
}: {
  icon: React.ReactNode;
  title: string;
  sku: string;
  iconOnly?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-1 rounded-lg border border-line bg-surface text-card-foreground shadow",
        iconOnly ? "flex size-10 items-center justify-center p-1" : "p-1",
      )}
    >
      {iconOnly ? (
        <div>{icon}</div>
      ) : (
        <div className="flex items-center gap-2">
          <div>{icon}</div>
          <div className="flex flex-col">
            <span className="text-[.8rem] font-medium text-ink">{title}</span>
            <span className="text-[.7rem] text-ink-3">{sku}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const DisplayCard = forwardRef<
  HTMLDivElement,
  {
    name: string;
    orderNumber: string;
    lineItems: Array<{ icon: React.ReactNode; title: string; sku: string }>;
    iconOnlyMode?: boolean;
    compactMode?: boolean;
    showFeeLoss?: boolean;
  }
>(({ name, orderNumber, lineItems, iconOnlyMode = false, compactMode = false, showFeeLoss = false }, ref) => (
  <div
    ref={ref}
    className={cn(
      "group relative z-10 flex-shrink-0 cursor-pointer overflow-visible rounded-xl border border-line bg-inset p-1 shadow-inner transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card",
      iconOnlyMode || compactMode ? "w-[10rem]" : "w-[12rem]",
    )}
  >
    <div className="relative flex flex-col">
      {iconOnlyMode ? (
        <>
          <div className="mb-1 flex items-center justify-between px-1 py-0.5">
            <CardLabel name={name} orderNumber={orderNumber} />
          </div>
          <div className="flex justify-center gap-0.5">
            {lineItems.map((item) => <LineItem key={item.sku} {...item} iconOnly />)}
          </div>
        </>
      ) : compactMode ? (
        <div className="flex items-center justify-between px-1 py-0.5">
          <CardLabel name={name} orderNumber={orderNumber} />
          {lineItems[0] ? <LineItem {...lineItems[0]} iconOnly /> : null}
        </div>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <CardLabel name={name} orderNumber={orderNumber} />
          </div>
          <div className="space-y-1">
            {lineItems.map((item) => <LineItem key={item.sku} {...item} />)}
          </div>
        </>
      )}
    </div>
    {!iconOnlyMode && !compactMode ? (
      <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-transparent via-inset to-transparent p-px opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    ) : null}
    {showFeeLoss ? (
      <span className="fee-loss-particle absolute right-2 top-0 z-20 hidden whitespace-nowrap font-mono text-[12px] font-bold text-red md:inline-block" aria-hidden="true">−15%</span>
    ) : null}
  </div>
));

DisplayCard.displayName = "DisplayCard";

function CardLabel({ name, orderNumber }: { name: string; orderNumber: string }) {
  return (
    <span className="flex flex-col text-sm text-ink">
      {name}
      <span className="text-xs text-ink-3">#{orderNumber}</span>
    </span>
  );
}

const bike = {
  icon: <div className="flex size-8 items-center justify-center rounded-md border border-signal bg-signal-tint text-signal-ink"><Bike className="size-4" strokeWidth={2} /></div>,
  title: "Road Bike",
  sku: "SKU: 32432943",
};
const tires = {
  icon: <div className="flex size-8 items-center justify-center rounded-md border border-green bg-green-tint text-green"><CircleIcon className="size-4" strokeWidth={2} /></div>,
  title: "Tires",
  sku: "SKU: 93443781",
};
const bottle = {
  icon: <div className="flex size-8 items-center justify-center rounded-md border border-orange bg-orange-tint text-orange"><Droplets className="size-4" strokeWidth={2} /></div>,
  title: "Water Bottle",
  sku: "SKU: 52139803",
};

function MarketplaceAvatar({ current }: { current: boolean }) {
  return (
    <div className="relative flex size-18 items-center justify-center">
      <VibeGhostWorkspaceGradient
        seed={current ? "closed-marketplace" : "open-agentic-marketplace"}
        accentColor={current ? "#64748b" : "#155dfc"}
        className={cn("size-14 drop-shadow-[0_5px_12px_color-mix(in_oklab,var(--ink)_16%,transparent)]", current ? "grayscale saturate-0" : "future-orb")}
      />
      {current ? (
        <div className="fee-burst pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
          <span className="fee-particle absolute whitespace-nowrap font-mono text-[16px] font-bold text-green">+15%</span>
        </div>
      ) : null}
    </div>
  );
}

type DiagramMode = "current" | "future";

export function MarketplaceFederationVisual() {
  const [mode, setMode] = useState<DiagramMode>("current");
  const current = mode === "current";
  const containerRef = useRef<HTMLDivElement>(null);
  const leftCardRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const supplier1Ref = useRef<HTMLDivElement>(null);
  const supplier2Ref = useRef<HTMLDivElement>(null);
  const supplier3Ref = useRef<HTMLDivElement>(null);
  const mobileBuyerRef = useRef<HTMLDivElement>(null);
  const mobileCenterRef = useRef<HTMLDivElement>(null);
  const mobileSupplier3Ref = useRef<HTMLDivElement>(null);

  return (
    <div className="mt-8">
      <Card className="overflow-hidden p-0">
        <div className="flex justify-center px-3 pt-3">
          <div className="inline-grid w-full min-w-0 grid-cols-2 gap-1 rounded-control md:w-auto bg-inset p-1 shadow-hairline" role="tablist" aria-label="Marketplace model">
            {([
              ["current", "The way it is"],
              ["future", "The way it should be"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  "h-7 min-w-0 whitespace-nowrap rounded-[6px] px-1 text-[10px] leading-none font-medium sm:px-3 sm:text-[11.5px] md:min-w-30 transition-[background-color,color,box-shadow] duration-150",
                  mode === value ? "bg-surface text-ink shadow-hairline" : "text-ink-3 hover:text-ink-2",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-10 sm:pt-5">
          <div ref={containerRef} className="relative isolate flex h-[500px] w-full items-center justify-center overflow-hidden">
            <div className="hidden size-full max-w-3xl flex-row items-center justify-between gap-10 md:flex">
              <div className="flex flex-col justify-center">
                <DisplayCard ref={leftCardRef} name="Jared Dunn" orderNumber="ORD-2349832" lineItems={[bike, tires, bottle]} />
              </div>

              <div ref={centerRef} className="z-10 flex items-center justify-center">
                <MarketplaceAvatar current={current} />
              </div>

              <div className="flex flex-col justify-center gap-10">
                <DisplayCard ref={supplier1Ref} name="John's Bikes" orderNumber="SELLER-1842" lineItems={[bike]} showFeeLoss={current} />
                <DisplayCard ref={supplier2Ref} name="Rolling Ridge" orderNumber="SELLER-2915" lineItems={[tires]} showFeeLoss={current} />
                <DisplayCard ref={supplier3Ref} name="Velo Supply Co." orderNumber="SELLER-6831" lineItems={[bottle]} showFeeLoss={current} />
              </div>
            </div>

            <div className="flex size-full flex-col items-center justify-center gap-7 md:hidden">
              <DisplayCard ref={mobileBuyerRef} name="Jared Dunn" orderNumber="ORD-2349832" lineItems={[bike, tires, bottle]} iconOnlyMode />
              <div ref={mobileCenterRef} className="relative z-10 flex items-center justify-center">
                <MarketplaceAvatar current={current} />
              </div>
              <div className="flex flex-col items-center gap-2">
                <DisplayCard name="John's Bikes" orderNumber="SELLER-1842" lineItems={[bike]} compactMode />
                <DisplayCard name="Rolling Ridge" orderNumber="SELLER-2915" lineItems={[tires]} compactMode />
                <DisplayCard ref={mobileSupplier3Ref} name="Velo Supply Co." orderNumber="SELLER-6831" lineItems={[bottle]} compactMode />
              </div>
            </div>

            <div className="hidden md:block">
              <AnimatedBeam className="z-0" key={`${mode}-buyer`} containerRef={containerRef} fromRef={leftCardRef} toRef={centerRef} duration={5} startXOffset={112} endXOffset={-28} />
              <AnimatedBeam className="z-0" key={`${mode}-seller-1`} containerRef={containerRef} fromRef={centerRef} toRef={supplier1Ref} duration={5} delay={0.25} endXOffset={-112} curvature={120} />
              <AnimatedBeam className="z-0" key={`${mode}-seller-2`} containerRef={containerRef} fromRef={centerRef} toRef={supplier2Ref} duration={5} delay={0.75} endXOffset={-112} />
              <AnimatedBeam className="z-0" key={`${mode}-seller-3`} containerRef={containerRef} fromRef={centerRef} toRef={supplier3Ref} duration={5} delay={1.25} endXOffset={-112} curvature={-120} />
            </div>

            <div className="md:hidden">
              <AnimatedBeam className="z-0" key={`${mode}-mobile-buyer`} containerRef={containerRef} fromRef={mobileBuyerRef} toRef={mobileCenterRef} orientation="vertical" duration={5} startYOffset={38} endYOffset={-36} />
              <AnimatedBeam className="z-0" key={`${mode}-mobile-sellers`} containerRef={containerRef} fromRef={mobileCenterRef} toRef={mobileSupplier3Ref} orientation="vertical" duration={5} delay={0.25} startYOffset={36} endYOffset={-25} />
            </div>
          </div>
        </div>
      </Card>

      <style jsx global>{`
        .fee-particle {
          display: inline-block;
          opacity: 0;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--inset);
          padding: 5px 8px;
          color: var(--green);
          box-shadow: var(--shadow-card);
          transform: translate(-50%, -50%) scale(.7);
          animation: fee-pop 5s cubic-bezier(.16, 1, .3, 1) infinite;
        }
        .fee-loss-particle {
          opacity: 0;
          border: 1px solid var(--line);
          border-radius: 7px;
          background: var(--inset);
          padding: 4px 7px;
          color: var(--red);
          box-shadow: var(--shadow-card);
          transform: translateY(-8px) scale(.7) rotate(0deg);
          animation: fee-loss-pop 5s cubic-bezier(.16, 1, .3, 1) infinite;
        }
        .future-orb {
          transform-box: fill-box;
          transform-origin: center;
          animation: orb-gradient-drift 7s ease-in-out infinite;
        }
        @keyframes orb-gradient-drift {
          0%, 100% { transform: translateY(0) rotate(-4deg) scale(1); filter: hue-rotate(0deg); }
          50% { transform: translateY(-3px) rotate(8deg) scale(1.08); filter: hue-rotate(16deg); }
        }
        @keyframes fee-pop {
          0%, 38% { opacity: 0; transform: translate(-50%, -50%) scale(.65); }
          44% { opacity: 1; transform: translate(-50%, -52px) scale(1); }
          62% { opacity: .9; transform: translate(-50%, -74px) scale(.96) rotate(-3deg); }
          74%, 100% { opacity: 0; transform: translate(-50%, -90px) scale(.8) rotate(4deg); }
        }
        @keyframes fee-loss-pop {
          0%, 38% { opacity: 0; transform: translateY(-8px) scale(.7) rotate(0deg); }
          44% { opacity: 1; transform: translateY(-22px) scale(1) rotate(2deg); }
          62% { opacity: .9; transform: translateY(-32px) scale(.96) rotate(4deg); }
          74%, 100% { opacity: 0; transform: translateY(-40px) scale(.82) rotate(6deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fee-particle {
            animation: none;
            opacity: 1;
            transform: translate(-50%, -52px) scale(1);
          }
          .fee-loss-particle {
            animation: none;
            opacity: 1;
            transform: translateY(-22px) scale(1);
          }
          .future-orb { animation: none; }
        }
      `}</style>
    </div>
  );
}
