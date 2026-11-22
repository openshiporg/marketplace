"use client";

import { SlidersHorizontal } from "lucide-react";

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

/**
 * Shoppers type and send; the AI key, provider and model are operator settings.
 * They sit behind one settings button that opens the full AI settings dialog.
 */
export function ModeSplitButton({ disabled = false, onSettingsClick }: ModeSplitButtonProps) {
  return (
    <button
      type="button"
      aria-label="AI settings"
      title="AI settings"
      disabled={disabled}
      onClick={onSettingsClick}
      className="flex size-8 items-center justify-center rounded-control text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink disabled:opacity-40 pointer-coarse:size-11"
    >
      <SlidersHorizontal className="size-4" strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
