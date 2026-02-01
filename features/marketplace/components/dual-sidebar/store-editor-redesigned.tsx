"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingBag,
  Store as StoreIcon,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  X,
  RotateCcw,
  MoreVertical,
} from "lucide-react";

interface Store {
  storeId: string;
  cartId?: string;
  baseUrl: string;
  platform: string;
  name?: string;
  storeName?: string;
  logoIcon?: string;
  logoColor?: string;
}

interface CartData {
  storeId: string;
  storeName?: string;
  logoIcon?: string;
  logoColor?: string;
  baseUrl?: string;
  platform?: string;
  cartId?: string;
}

interface StoreEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig: Store[];
  onSave: (newConfig: Store[]) => void;
  cartsData?: CartData[];
  onCartSelect?: (storeName: string, storeId: string) => void;
  onResetToDefault?: () => void;
  isDefaultConfig?: boolean;
}

const PLATFORMS = {
  shopify: {
    name: "Shopify",
    icon: ShoppingBag,
    exampleUrl: "https://your-store.myshopify.com",
  },
  openfront: {
    name: "Openfront",
    icon: StoreIcon,
    exampleUrl: "https://your-store.openship.org",
  },
} as const;

type PlatformKey = keyof typeof PLATFORMS;

function StoreCard({
  store,
  index,
  onEdit,
  onDelete,
  onCartSelect,
  onOpenChange,
}: {
  store: Store;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onCartSelect?: (storeName: string, storeId: string) => void;
  onOpenChange?: () => void;
}) {
  const displayName = store.storeName || store.name || (() => {
    try {
      const url = new URL(store.baseUrl);
      const hostname = url.hostname.replace('www.', '');
      return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    } catch {
      return 'Unknown Store';
    }
  })();

  const logoIcon = store.logoIcon;
  const logoColor = store.logoColor;

  return (
    <div className="flex items-center justify-between gap-2 group">
        {/* Store Info - always visible */}
        <div
          className="flex items-center gap-2 flex-1 min-w-0 px-1.5 py-1 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => {
            // View cart action handled in dropdown menu
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: logoIcon
                ? logoColor || "#e5e7eb"
                : "#f3f4f6",
              border: logoIcon ? "none" : "2px solid #e5e7eb",
            }}
          >
            {logoIcon ? (
              <div
                dangerouslySetInnerHTML={{ __html: logoIcon }}
                className="w-3.5 h-3.5"
                style={{
                  filter: `hue-rotate(${logoColor || "0"}deg)`,
                }}
              />
            ) : (
              <StoreIcon className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-medium text-sm truncate">
              {displayName}
            </span>
            {store.cartId && (
              <span className="text-xs text-muted-foreground truncate">
                Active cart
              </span>
            )}
          </div>
        </div>

        {/* Ellipsis menu for store actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center h-7 w-7 opacity-60 hover:opacity-100 hover:bg-accent rounded-md transition-colors"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={4} align="end">
            {/* View Cart */}
            {store.cartId && (
              <DropdownMenuItem onClick={() => {
                if (onCartSelect) {
                  onCartSelect(store.storeName || store.name || 'Store', store.storeId);
                  if (onOpenChange) onOpenChange();
                }
              }}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                View Cart
              </DropdownMenuItem>
            )}

            {/* Open in new tab */}
            {store.baseUrl && (
              <DropdownMenuItem onClick={() => window.open(store.baseUrl, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in new tab
              </DropdownMenuItem>
            )}

            {/* Edit Store */}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Store
            </DropdownMenuItem>

            {/* Delete Store */}
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Store
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
}

function AddStoreForm({
  onSave,
  onCancel,
  existingUrls,
  isEditing,
  initialValues,
}: {
  onSave: (store: Store) => void;
  onCancel: () => void;
  existingUrls: string[];
  isEditing?: boolean;
  initialValues?: Store;
}) {
  const [platform, setPlatform] = useState<PlatformKey | "">((initialValues?.platform as PlatformKey) || "");
  const [baseUrl, setBaseUrl] = useState(initialValues?.baseUrl || "");
  const [name, setName] = useState(initialValues?.name || initialValues?.storeName || "");
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only auto-generate name if user hasn't typed one and we're not in editing mode (unless initial name was empty)
    if (baseUrl && !name && !isEditing) {
      try {
        const url = new URL(baseUrl);
        const hostname = url.hostname.replace('www.', '');
        const generatedName = hostname
          .split('.')[0]
          .charAt(0)
          .toUpperCase() + hostname.split('.')[0].slice(1);
        setName(generatedName);
      } catch {}
    }
  }, [baseUrl, name, isEditing]);

  useEffect(() => {
    let valid = true;
    const errors = [];

    if (!baseUrl) {
      valid = false;
    } else {
      try {
        new URL(baseUrl);
      } catch {
        errors.push("Invalid URL format");
        valid = false;
      }
    }

    if (!platform) {
      valid = false;
    }

    if (existingUrls.includes(baseUrl)) {
      errors.push("This store is already in your list");
      valid = false;
    }

    setError(errors.length > 0 ? errors[0] : null);
    setIsValid(valid);
  }, [baseUrl, platform, existingUrls]);

  const selectedPlatform = platform ? PLATFORMS[platform] : null;

  const handleSave = () => {
    if (!isValid || !platform) return;

    onSave({
      storeId: initialValues?.storeId || "", // Preserve storeId if editing
      baseUrl: baseUrl.trim(),
      platform,
      name: name.trim() || undefined,
      storeName: name.trim() || undefined, // Also set storeName for display
    });
  };

  return (
    <div className="space-y-4 py-2">
      {/* Platform */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Platform</Label>
        <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformKey)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PLATFORMS).map(([key, config]) => {
              return (
                <SelectItem key={key} value={key}>
                  <span>{config.name}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* URL */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Store URL</Label>
        <Input
          type="url"
          placeholder={selectedPlatform?.exampleUrl || "https://your-store.com"}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className={`h-9 text-sm ${error ? "border-destructive" : ""}`}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Store Name (optional)</Label>
        <Input
          placeholder="Auto-generated"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1 h-9 text-sm">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isValid} className="flex-1 h-9 text-sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {isEditing ? "Save" : "Add"}
        </Button>
      </div>
    </div>
  );
}

export function StoreEditor({
  open,
  onOpenChange,
  currentConfig,
  onSave,
  cartsData,
  onCartSelect,
  onResetToDefault,
  isDefaultConfig,
}: StoreEditorProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open && currentConfig) {
      // Merge current config with cart data (logo info from API)
      const storesWithLogos = currentConfig.map(store => {
        const cartData = cartsData?.find(c => 
          (store.storeId && c.storeId === store.storeId) || 
          (c.baseUrl && store.baseUrl && c.baseUrl === store.baseUrl)
        );
        return {
          ...store,
          storeId: cartData?.storeId || store.storeId,
          cartId: cartData?.cartId,
          logoIcon: cartData?.logoIcon || store.logoIcon,
          logoColor: cartData?.logoColor || store.logoColor,
          storeName: cartData?.storeName || store.name,
        };
      });
      setStores(storesWithLogos);
      setEditingIndex(null);
      setIsAdding(false);
    }
  }, [open, currentConfig, cartsData]);

  const handleSave = () => {
    onSave(stores);
    onOpenChange(false);
  };

  const handleAddStore = (newStore: Store) => {
    const updatedStores = [...stores, newStore];
    setStores(updatedStores);
    setIsAdding(false);
    onSave(updatedStores);
  };

  const handleUpdateStore = (index: number, updatedStore: Store) => {
    const newStores = [...stores];
    newStores[index] = updatedStore;
    setStores(newStores);
    setEditingIndex(null);
    onSave(newStores);
  };

  const handleDeleteStore = (index: number) => {
    const newStores = stores.filter((_, i) => i !== index);
    setStores(newStores);
    onSave(newStores);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0">
        <DialogTitle className="sr-only">Manage Stores</DialogTitle>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Stores</h3>
            {!isDefaultConfig && onResetToDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onResetToDefault();
                  onOpenChange(false);
                }}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {isAdding || editingIndex !== null ? (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="border rounded-md p-3 bg-muted/50"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">
                  {isAdding ? "Add Store" : "Edit Store"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingIndex(null);
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <AddStoreForm
                onSave={isAdding ? handleAddStore : (store) => handleUpdateStore(editingIndex!, store)}
                onCancel={() => {
                  setIsAdding(false);
                  setEditingIndex(null);
                }}
                existingUrls={stores
                  .filter((_, i) => i !== editingIndex)
                  .map(s => s.baseUrl)}
                isEditing={editingIndex !== null}
                initialValues={editingIndex !== null ? stores[editingIndex] : undefined}
              />
            </motion.div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {stores.map((store, index) => {
                  return (
                    <div key={index}>
                      {index > 0 && <div className="h-px bg-border" />}
                      <StoreCard
                        store={store}
                        index={index}
                        onEdit={() => setEditingIndex(index)}
                        onDelete={() => handleDeleteStore(index)}
                        onCartSelect={onCartSelect}
                        onOpenChange={() => onOpenChange(false)}
                      />
                    </div>
                  );
                })}
              </AnimatePresence>

              {stores.length === 0 && (
                <div className="text-center py-8">
                  <StoreIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No stores</p>
                </div>
              )}
            </div>
          )}

          {!isAdding && editingIndex === null && (
            <Button
              variant="outline"
              className="w-full mt-3 h-8 text-xs"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-3 h-3 mr-1.5" />
              Add Store
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
