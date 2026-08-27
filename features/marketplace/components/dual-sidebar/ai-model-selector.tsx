"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
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

const POPULAR_MODELS = [
  { name: "GPT-4o Mini", slug: "openai/gpt-4o-mini", note: "Proven and inexpensive" },
  { name: "GPT-5.6 Luna", slug: "openai/gpt-5.6-luna", note: "Current GPT model" },
  { name: "GPT-5 Nano", slug: "openai/gpt-5-nano", note: "Fast OpenAI model" },
  { name: "Gemma 3n 4B", slug: "google/gemma-3n-e4b-it", note: "Efficient open model" },
  { name: "Llama 3.2 3B", slug: "meta-llama/llama-3.2-3b-instruct", note: "Compact open model" },
  { name: "Gemini 3.1 Flash Lite", slug: "google/gemini-3.1-flash-lite", note: "High-throughput multimodal" },
  { name: "Qwen 3.7 Flash", slug: "qwen/qwen3.7-flash", note: "Lightweight agent model" },
  { name: "GPT-4.1 Mini", slug: "openai/gpt-4.1-mini", note: "Small tool-use model" },
  { name: "Ministral 3 3B", slug: "mistralai/ministral-3b-2512", note: "Small Mistral model" },
  { name: "Phi 4", slug: "microsoft/phi-4", note: "Compact reasoning model" },
];

type DiscoveredModel = {
  id: string;
  ownedBy?: string;
};

interface AIModelSelectorProps {
  disabled?: boolean;
  globalModel?: string;
  showLabelOnMobile?: boolean;
}

export function AIModelSelector({
  disabled = false,
  globalModel,
  showLabelOnMobile = false,
}: AIModelSelectorProps) {
  const { config, setConfig } = useAiConfig();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [customModels, setCustomModels] = useState<DiscoveredModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const isCustomProvider = config.keyMode === "local" && config.localKeys?.provider === "custom";
  const customEndpoint = config.localKeys?.customEndpoint || "";
  const customApiKey = config.localKeys?.apiKey || "";
  const currentModel = config.keyMode === "local"
    ? config.localKeys?.model || "openai/gpt-4o-mini"
    : globalModel || "openai/gpt-4o-mini";

  const handleModelChange = useCallback((modelSlug: string) => {
    if (config.keyMode !== "local") return;
    setConfig({
      ...config,
      localKeys: {
        provider: config.localKeys?.provider || "openrouter",
        apiKey: config.localKeys?.apiKey || "",
        model: modelSlug,
        maxTokens: config.localKeys?.maxTokens || "4000",
        customEndpoint: config.localKeys?.customEndpoint,
      },
    });
  }, [config, setConfig]);

  const loadCustomModels = useCallback(async (signal?: AbortSignal) => {
    if (!customEndpoint.trim()) {
      setCustomModels([]);
      setModelsError("Add a custom endpoint in AI settings first.");
      return;
    }

    setModelsLoading(true);
    setModelsError(null);
    setCustomModels([]);
    try {
      const response = await fetch("/api/ai-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: customEndpoint, apiKey: customApiKey }),
        signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load models");
      }
      setCustomModels(Array.isArray(payload?.models) ? payload.models : []);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setModelsError(error instanceof Error ? error.message : "Unable to load models");
    } finally {
      if (!signal?.aborted) setModelsLoading(false);
    }
  }, [customApiKey, customEndpoint]);

  useEffect(() => {
    if (!isDropdownOpen || !isCustomProvider) return;
    const controller = new AbortController();
    void loadCustomModels(controller.signal);
    return () => controller.abort();
  }, [isCustomProvider, isDropdownOpen, loadCustomModels]);

  const filteredCustomModels = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return customModels;
    return customModels.filter((model) =>
      model.id.toLowerCase().includes(query) || model.ownedBy?.toLowerCase().includes(query)
    );
  }, [customModels, inputValue]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (!isCustomProvider) handleModelChange(value);
  };

  const handleSelectModel = (modelSlug: string) => {
    handleModelChange(modelSlug);
    setInputValue("");
    setIsDropdownOpen(false);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (isCustomProvider && inputValue.trim()) {
      const exact = customModels.find((model) => model.id.toLowerCase() === inputValue.trim().toLowerCase());
      handleSelectModel(exact?.id || inputValue.trim());
      return;
    }
    setIsDropdownOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDropdownOpen(open);
    if (open) setInputValue("");
  };

  const selectedModel = POPULAR_MODELS.find((model) => model.slug === currentModel);
  const displayText = isCustomProvider ? currentModel : selectedModel?.name || currentModel;

  const selector = (
    <Popover open={isDropdownOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={displayText}
          className={`inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-control bg-surface px-2 text-[11.5px] font-medium text-ink-2 shadow-btn outline-none transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-ink active:scale-[.98] disabled:pointer-events-none disabled:opacity-40 ${showLabelOnMobile ? "w-auto max-w-36" : "w-7 sm:w-auto"}`}
        >
          <span className={`${showLabelOnMobile ? "inline max-w-28" : "hidden max-w-28 sm:inline"} truncate`}>{displayText}</span>
          <Sparkles className={`size-3 text-ink-3 ${showLabelOnMobile ? "hidden" : "sm:hidden"}`} />
          <ChevronDown className={`size-3 text-ink-3 ${showLabelOnMobile ? "block" : "hidden sm:block"}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(20rem,calc(100vw-1rem))] p-0"
        align="start"
        side="top"
        sideOffset={8}
        collisionPadding={8}
      >
        <div className="border-b border-line p-2.5">
          <Input
            placeholder={isCustomProvider ? "Search models" : "Model slug (e.g. openai/gpt-4o-mini)"}
            value={inputValue}
            onChange={(event) => handleInputChange(event.target.value)}
            onKeyDown={handleInputKeyDown}
            className="h-9 text-base sm:text-sm"
          />
        </div>
        <div className={`${isCustomProvider ? "h-[280px]" : "max-h-[280px]"} overflow-y-auto py-2`}>
          {isCustomProvider ? (
            <>
              <div className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[.08em] text-ink-3">
                  Endpoint models{!modelsLoading && customModels.length > 0 ? ` · ${customModels.length}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => void loadCustomModels()}
                  disabled={modelsLoading || !customEndpoint.trim()}
                  aria-label="Refresh endpoint models"
                  className="beautiful-icon-button size-6 rounded-control text-ink-3 disabled:opacity-40"
                >
                  <RefreshCw className={`size-3 ${modelsLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="mx-2 mb-2 flex items-center gap-2 rounded-control bg-inset px-2.5 py-2 shadow-hairline">
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[9px] font-medium uppercase tracking-[.08em] text-ink-3">Selected model</span>
                  <span className="mt-0.5 block truncate font-mono text-[11.5px] font-medium text-ink">{currentModel}</span>
                </span>
                <Check className="size-3.5 shrink-0 text-signal" />
              </div>

              {modelsLoading ? (
                <div className="flex items-center gap-2 px-3 py-5 text-[11.5px] text-ink-3">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Loading models from the endpoint…
                </div>
              ) : modelsError ? (
                <div className="px-3 py-3">
                  <p className="text-[11.5px] leading-[1.45] text-red">{modelsError}</p>
                  {modelsError.includes("not admitted") ? (
                    <p className="mt-1.5 text-[10.5px] leading-[1.45] text-ink-3">
                      The selected model is still saved. This deployment must allow the proxy origin before its model list can be loaded.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void loadCustomModels()}
                    className="mt-2 text-[11.5px] font-medium text-ink underline decoration-line-strong underline-offset-4"
                  >
                    Try again
                  </button>
                </div>
              ) : filteredCustomModels.length === 0 ? (
                <div className="px-3 py-4 text-[11.5px] text-ink-3">
                  No models match this search. Press Enter to use an exact model ID.
                </div>
              ) : (
                <div className="space-y-0.5 px-1">
                  {filteredCustomModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleSelectModel(model.id)}
                      className="flex w-full items-center gap-2 rounded-[7px] px-2 py-2 text-left transition-colors duration-150 hover:bg-hover"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[11.5px] font-medium text-ink">{model.id}</span>
                        {model.ownedBy ? (
                          <span className="block truncate text-[10.5px] text-ink-3">{model.ownedBy}</span>
                        ) : null}
                      </span>
                      {currentModel === model.id ? <Check className="size-3.5 shrink-0 text-signal" /> : null}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="px-2 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[.08em] text-ink-3">
                Popular Models
              </div>
              <div className="space-y-1">
                {POPULAR_MODELS.map((model) => (
                  <button
                    key={model.slug}
                    type="button"
                    onClick={() => handleSelectModel(model.slug)}
                    className="w-full rounded-[7px] px-2 py-2 text-left transition-colors duration-150 hover:bg-hover"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium text-ink">{model.name}</span>
                        <span className="block truncate font-mono text-[10px] text-ink-3">{model.slug}</span>
                      </span>
                      <span className="shrink-0 text-[10.5px] text-ink-3">{model.note}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{selector}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Model is set by global configuration</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return selector;
}
