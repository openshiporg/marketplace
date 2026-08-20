import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getStoreLogoHue } from "@/lib/store-logo";

interface StoreLogoProps {
  logoIcon?: string;
  logoColor?: string;
  className?: string;
  iconClassName?: string;
  fallback?: ReactNode;
}

export function StoreLogo({
  logoIcon,
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
      {logoIcon ? (
        <span
          dangerouslySetInnerHTML={{ __html: logoIcon }}
          className={cn(
            "flex items-center justify-center [&>svg]:block [&>svg]:h-full [&>svg]:w-full",
            iconClassName
          )}
          style={{ filter: `hue-rotate(${getStoreLogoHue(logoColor)}deg)` }}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
