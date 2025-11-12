"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MarketplaceConfigEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig: any[];
  onSave: (newConfig: any[]) => void;
}

export function MarketplaceConfigEditor({
  open,
  onOpenChange,
  currentConfig,
  onSave,
}: MarketplaceConfigEditorProps) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Update JSON text whenever currentConfig or open changes
  useEffect(() => {
    if (open && currentConfig) {
      setJsonText(JSON.stringify(currentConfig, null, 2));
      setError(null);
    }
  }, [open, currentConfig]);

  // Reset JSON text when dialog opens with new config
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);

      // Validate it's an array
      if (!Array.isArray(parsed)) {
        setError("Config must be an array of store objects");
        return;
      }

      // Validate each item has required fields
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (!item.baseUrl || typeof item.baseUrl !== 'string') {
          setError(`Item ${i + 1}: Missing or invalid "baseUrl" field`);
          return;
        }
        if (!item.platform || typeof item.platform !== 'string') {
          setError(`Item ${i + 1}: Missing or invalid "platform" field`);
          return;
        }
      }

      // Valid! Save it
      onSave(parsed);
      onOpenChange(false);
      setError(null);
    } catch (e) {
      setError("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Marketplace Configuration</DialogTitle>
          <DialogDescription>
            Each store needs a "baseUrl" and "platform" field.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-3">
          <Textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null); // Clear error as user types
            }}
            className="font-mono text-xs min-h-[200px] resize-none"
            placeholder="Paste your JSON configuration here..."
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
