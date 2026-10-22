"use client";

import { Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAiConfig } from "../../hooks/use-ai-config";

interface SimpleSettingsPopoverProps {
  disabled?: boolean;
}

const PROVIDERS = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "custom", label: "Custom OpenAI" },
];

export function SimpleSettingsPopover({ disabled = false }: SimpleSettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const { config, setConfig } = useAiConfig();
  const [provider, setProvider] = useState<"openrouter" | "custom">("openrouter");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [maxTokens, setMaxTokens] = useState("4000");

  // Check if we should show warning (local mode but no API key)
  const isLocalMode = config.keyMode === "local";
  const hasApiKey = !!(config.localKeys?.apiKey);
  const showWarning = isLocalMode && !hasApiKey;

  // Sync with current config when popover opens
  useEffect(() => {
    if (open) {
      const currentProvider = config.localKeys?.provider as "openrouter" | "custom" | undefined;
      setProvider(currentProvider || "openrouter");
      setCustomEndpoint(config.localKeys?.customEndpoint || "");
      setApiKey(config.localKeys?.apiKey || "");
      setMaxTokens(config.localKeys?.maxTokens || "4000");
    }
  }, [open, config]);

  const handleSave = () => {
    const finalApiKey = apiKey || config.localKeys?.apiKey || "";
    setConfig({
      ...config,
      localKeys: {
        provider,
        customEndpoint,
        apiKey: finalApiKey,
        model: config.localKeys?.model || "openai/gpt-4o-mini",
        maxTokens,
      },
    });
    setOpen(false);
  };

  const button = (
    <button
      type="button"
      aria-label="AI settings"
      disabled={disabled}
      className={`beautiful-icon-button size-7 rounded-control bg-surface shadow-btn disabled:pointer-events-none disabled:opacity-40 ${showWarning ? "text-red" : "text-ink-3"}`}
    >
      <Settings2 className="size-3" />
    </button>
  );

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              {button}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Switch to local configuration to bring your own key</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {button}
      </PopoverTrigger>
      <PopoverContent
        className="flex min-h-0 w-[min(320px,calc(100vw-16px))] flex-col overflow-hidden p-0"
        style={{ maxHeight: "min(var(--radix-popover-content-available-height), calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1rem))" }}
        align="start"
        side="top"
        sideOffset={8}
        collisionPadding={8}
      >
        {/* <div className="border-b px-4 py-3">
          <h3 className="font-medium text-sm">AI Assistant Settings</h3>
        </div> */}

        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-3 [-webkit-overflow-scrolling:touch]">
          {/* Provider Selection */}
          <div className="mb-4">
            <Label htmlFor="provider" className="text-xs font-medium">
              Provider
            </Label>
            <Select value={provider} onValueChange={(value: "openrouter" | "custom") => setProvider(value)}>
              <SelectTrigger id="provider" className="h-9 text-sm mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {provider === "custom" && (
              <div className="mt-3">
                <Label htmlFor="custom-endpoint" className="text-xs font-medium">
                  Endpoint
                </Label>
                <Input
                  id="custom-endpoint"
                  placeholder="8317"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  className="mt-1.5 h-9 text-base sm:text-sm"
                />
                <p className="mt-1.5 text-[11px] leading-[1.35] text-ink-3">
                  Enter a local port such as 8317, a server URL, /v1, or /v1/models. Models are loaded automatically.
                </p>
              </div>
            )}
          </div>

          {/* API Key */}
          <div>
            <Label htmlFor="api-key" className="text-xs font-medium">
              API Key
            </Label>
            <Input
              id="api-key"
              type="text"
              placeholder={
                provider === 'custom'
                  ? "Enter your API key..."
                  : "sk-or-v1-..."
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1.5 h-9 font-mono text-base sm:text-sm"
            />
            <p className="mt-3 text-[11.5px] text-ink-3">
              {provider === "custom"
                ? "Use any non-empty value if your local proxy does not require a key."
                : "Your key is only saved locally in your browser."}
            </p>
          </div>

          <div className="mt-3">
            <Label htmlFor="max-tokens" className="text-xs font-medium">
              Max Tokens
            </Label>
            <Select value={maxTokens} onValueChange={setMaxTokens}>
              <SelectTrigger id="max-tokens" className="h-9 text-sm mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2000">2,000 tokens</SelectItem>
                <SelectItem value="4000">4,000 tokens</SelectItem>
                <SelectItem value="8000">8,000 tokens</SelectItem>
                <SelectItem value="16000">16,000 tokens</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface px-3 py-2.5">
          {/* <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button> */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={
              (!apiKey && !config.localKeys?.apiKey) ||
              (provider === "custom" && !customEndpoint.trim())
            }
          >
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
