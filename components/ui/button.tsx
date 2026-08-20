import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control text-[13px] font-medium outline-none transition-[background-color,color,opacity,transform] duration-150 ease-[var(--ease-out)] active:scale-[.98] disabled:pointer-events-none disabled:opacity-35 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-ink text-surface shadow-btn hover:opacity-90",
        destructive: "bg-red text-surface shadow-btn hover:opacity-90",
        outline: "bg-surface text-ink shadow-btn hover:bg-hover",
        secondary: "bg-inset text-ink-2 shadow-hairline hover:bg-hover-2 hover:text-ink",
        ghost: "text-ink-2 hover:bg-hover hover:text-ink",
        link: "text-signal-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 gap-1.5 px-2.5 text-[12px]",
        lg: "h-9 px-4 text-[13.5px]",
        icon: "size-8 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
