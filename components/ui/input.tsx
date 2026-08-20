import { cn } from "@/lib/utils";
import * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-ink-3 flex h-8 w-full min-w-0 rounded-control border border-line-strong bg-field px-2.5 py-1 text-[13px] text-ink shadow-[var(--shadow-inset-field)] outline-none transition-[background-color,border-color,box-shadow] duration-150 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[12px] file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:border-signal focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-signal/20",
        "aria-invalid:border-red aria-invalid:ring-red/20",
        type === "search" &&
          "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none",
        type === "file" &&
          "text-muted-foreground/70 file:border-input file:text-foreground p-0 pr-3 italic file:me-3 file:h-full file:border-0 file:border-r file:border-solid file:bg-transparent file:px-3 file:font-medium file:not-italic",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
