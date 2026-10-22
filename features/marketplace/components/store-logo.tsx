import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getStoreLogoHue } from "@/lib/store-logo";
import { Store } from "lucide-react";

interface StoreLogoProps {
  logoIcon?: string;
  logoColor?: string;
  className?: string;
  iconClassName?: string;
  fallback?: ReactNode;
}

export function StoreLogo({
  logoColor,
  className,
  iconClassName,
  fallback,
}: StoreLogoProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("flex items-center justify-center", iconClassName)}
        style={{ filter: `hue-rotate(${getStoreLogoHue(logoColor)}deg)` }}
      >
        {fallback || <Store className="size-3.5 text-ink-3" />}
      </span>
    </span>
  );
}
