"use client";

import { ConfigToggleButton } from "./config-toggle-button";
import { SimpleSettingsPopover } from "./simple-settings-popover";
import { AIModelSelector } from "./ai-model-selector";
import { useAiConfig } from "../../hooks/use-ai-config";

interface ModeSplitButtonProps {
  disabled?: boolean;
  onSettingsClick?: () => void;
  sharedKeys?: {
    apiKey: string;
    model: string;
    maxTokens: number;
  } | null;
  showModelLabelOnMobile?: boolean;
}

export function ModeSplitButton({
  disabled = false,
  onSettingsClick,
  sharedKeys,
  showModelLabelOnMobile = false,
}: ModeSplitButtonProps) {
  const { config: aiConfig, localAiEnabled } = useAiConfig();
  const isGlobalMode = aiConfig.keyMode === "env";

  return (
    <div className="flex items-center gap-2">
      {localAiEnabled ? (
        <ConfigToggleButton disabled={disabled} globalEnvsExist={!!sharedKeys} />
      ) : null}
      <SimpleSettingsPopover disabled={disabled || isGlobalMode} />
      <AIModelSelector
        disabled={disabled || isGlobalMode}
        globalModel={sharedKeys?.model}
        showLabelOnMobile={showModelLabelOnMobile}
      />
    </div>
  );
}
