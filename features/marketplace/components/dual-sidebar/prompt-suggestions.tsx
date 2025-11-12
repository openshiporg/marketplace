"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PromptSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
}

// Prompt suggestions with coming soon features
const suggestions = [
  { text: "Show me products I can buy", enabled: true },
  { text: "Find the nearest grocery store", enabled: false },
  { text: "Book a hotel for me in New York", enabled: false },
  { text: "Schedule a haircut appointment", enabled: false },
];

export function PromptSuggestions({ onSuggestionClick }: PromptSuggestionsProps) {
  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestions.map((suggestion, index) => (
        <motion.div
          key={suggestion.text}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
        >
          <button
            onClick={() => suggestion.enabled && onSuggestionClick(suggestion.text)}
            disabled={!suggestion.enabled}
            className={`inline-flex items-center justify-between gap-2 w-full h-auto whitespace-normal rounded-full px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input text-left ${
              suggestion.enabled
                ? "bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer"
                : "bg-muted/30 text-muted-foreground cursor-not-allowed opacity-80"
            }`}
          >
            <span className="flex-1">{suggestion.text}</span>
            {!suggestion.enabled && (
              <Badge variant="secondary" className="text-xs">
                Soon
              </Badge>
            )}
          </button>
        </motion.div>
      ))}
    </div>
  );
}
