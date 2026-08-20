"use client";

import { ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatUnactivatedStateProps {
  userName?: string;
  onActivate: () => void;
  variant?: "default" | "compact";
}

export function ChatUnactivatedState({ userName, onActivate, variant = "default" }: ChatUnactivatedStateProps) {
  const compact = variant === "compact";

  return (
    <section className={`w-full rounded-card bg-surface shadow-raised ${compact ? "max-w-sm" : "max-w-md"}`}>
      <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
        <span className="grid grid-cols-3 gap-px" aria-hidden>
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className="size-[3px] rounded-[1px] bg-ink" style={{ opacity: .2 + index * .07 }} />
          ))}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold tracking-normal text-ink">Activate marketplace chat</h2>
          <p className="truncate text-[11.5px] text-ink-3">{userName ? `Ready for ${userName}` : "One setup step remains"}</p>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex gap-3 rounded-control bg-orange-tint p-3 text-orange shadow-hairline">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p className="text-[12.5px] leading-relaxed">
            The assistant can create carts and submit commerce actions on your behalf. Review the key configuration before continuing.
          </p>
        </div>
        <Button onClick={onActivate} className="w-full justify-between">
          Configure assistant
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </section>
  );
}
