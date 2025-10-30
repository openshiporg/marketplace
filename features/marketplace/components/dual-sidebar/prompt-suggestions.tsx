"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface PromptSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
}

// Vercel-style suggestions: simple text, no icons
const suggestions = [
  "Show me all available products",
  "Create a cart for me from the US",
  "Tell me about your best-selling products",
  "What products would you recommend for me?",
];

export function PromptSuggestions({ onSuggestionClick }: PromptSuggestionsProps) {
  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestions.map((suggestion, index) => (
        <motion.div
          key={suggestion}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
        >
          <button
            onClick={() => onSuggestionClick(suggestion)}
            className="inline-flex items-center justify-start gap-2 w-full h-auto whitespace-normal rounded-full px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer text-left"
          >
            {suggestion}
          </button>
        </motion.div>
      ))}
    </div>
  );
}
