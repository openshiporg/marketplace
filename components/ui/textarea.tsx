import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-control border border-line-strong bg-field px-2.5 py-2 text-[16px] text-ink sm:text-[13px] shadow-[var(--shadow-inset-field)] outline-none placeholder:text-ink-3 transition-[background-color,border-color] duration-150 focus-visible:border-signal focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-signal/20 disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
