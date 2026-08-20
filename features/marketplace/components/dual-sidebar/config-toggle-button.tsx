"use client";

import { useState } from "react";
import { AlertCircle, Check, Globe, Laptop, Server } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAiConfig } from "../../hooks/use-ai-config";

interface ConfigToggleButtonProps {
  disabled?: boolean;
  globalEnvsExist?: boolean;
}

const MODES = [
  {
    id: "env" as const,
    label: "Global configuration",
    description: "Use the marketplace server settings.",
    icon: Server,
  },
  {
    id: "local" as const,
    label: "Local configuration",
    description: "Use settings stored only in this browser.",
    icon: Laptop,
  },
];

export function ConfigToggleButton({
  disabled = false,
  globalEnvsExist = true,
}: ConfigToggleButtonProps) {
  const { config, setConfig } = useAiConfig();
  const [open, setOpen] = useState(false);
  const isGlobal = config.keyMode === "env";
  const showWarning = isGlobal && !globalEnvsExist;

  const selectMode = (keyMode: "env" | "local") => {
    setConfig({ ...config, keyMode });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`AI configuration: ${isGlobal ? "global" : "local"}`}
          className={cn(
            "beautiful-icon-button size-7 rounded-[5px] bg-surface shadow-btn disabled:pointer-events-none disabled:opacity-40",
            showWarning ? "text-red" : isGlobal ? "text-signal-ink" : "text-green"
          )}
        >
          {showWarning ? <AlertCircle className="size-3" /> : <Globe className="size-3" />}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(19rem,calc(100vw-2rem))] rounded-[5px] p-1.5"
      >
        <div className="px-2 pb-1.5 pt-1">
          <p className="text-[12px] font-medium text-ink">AI configuration</p>
          <p className="mt-0.5 text-[11.5px] leading-[1.35] text-ink-3">
            Choose where your model credentials come from.
          </p>
        </div>

        <div className="space-y-0.5">
          {MODES.map((mode) => {
            const active = config.keyMode === mode.id;
            const ModeIcon = mode.icon;
            const unavailable = mode.id === "env" && !globalEnvsExist;

            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={active}
                onClick={() => selectMode(mode.id)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-[4px] px-2 py-2 text-left transition-colors duration-150",
                  active ? "bg-inset text-ink" : "text-ink-2 hover:bg-hover hover:text-ink"
                )}
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-ink-3">
                  <ModeIcon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium">
                    {mode.label}
                    {unavailable && <AlertCircle className="size-3 text-red" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-[1.35] text-ink-3">
                    {unavailable ? "Server environment variables are not set." : mode.description}
                  </span>
                </span>
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                  {active && <Check className="size-3.5 text-signal-ink" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mx-2 mt-1 border-t border-line pb-1 pt-2 text-[10.5px] leading-[1.35] text-ink-3">
          {isGlobal
            ? "Global settings are managed by the marketplace deployment."
            : "Your API key and model settings never leave this browser except for model requests."}
        </div>
      </PopoverContent>
    </Popover>
  );
}
