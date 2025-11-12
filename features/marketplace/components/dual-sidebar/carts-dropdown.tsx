"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, ShoppingBag, ExternalLink, Edit3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  getMarketplaceConfig,
  setMarketplaceConfig,
  resetMarketplaceConfig,
  isDefaultConfig,
} from "@/lib/marketplace-storage";
import { MarketplaceConfigEditor } from "./marketplace-config-editor";

interface Cart {
  storeId: string;
  cartId: string;
  storeName?: string;
  logoIcon?: string;
  logoColor?: string;
  baseUrl?: string;
}

interface CartsDropdownProps {
  cartIds: Record<string, string>;
  onCartSelect: (storeName: string, storeId: string) => void;
  disabled?: boolean;
}

export function CartsDropdown({
  cartIds,
  onCartSelect,
  disabled,
}: CartsDropdownProps) {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState<'idle' | 'confirm'>('idle');
  const [resetMode, setResetMode] = useState<'idle' | 'confirm'>('idle');
  const [showEditor, setShowEditor] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any[]>([]);
  const [isCustomConfig, setIsCustomConfig] = useState(false);

  // Check if config is custom (modified from default)
  useEffect(() => {
    if (open) {
      setIsCustomConfig(!isDefaultConfig());
    }
  }, [open]);

  // Listen for marketplace config updates
  useEffect(() => {
    const handleConfigUpdate = () => {
      // Refetch store info when config changes
      fetchStoreInfo();
    };

    window.addEventListener('marketplaceConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('marketplaceConfigUpdated', handleConfigUpdate);
  }, []);

  const fetchStoreInfo = async () => {
    setIsLoading(true);
    try {
      // Get marketplace config from localStorage (user's custom or default)
      const marketplaceConfig = getMarketplaceConfig();

      // Pass the user's config to the backend so it can process ALL stores with proper adapters
      const response = await fetch("/api/mcp-transport/http", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-marketplace-config": JSON.stringify(marketplaceConfig),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "getAvailableStores",
            arguments: {},
          },
        }),
      });

      const data = await response.json();

      if (data.result?.content?.[0]?.text) {
        const storesData = JSON.parse(data.result.content[0].text);
        const stores = storesData.stores || [];

        // Show ALL stores from backend response with cart info if available
        const cartsWithInfo: Cart[] = stores.map((store: any) => {
          const cartId = cartIds[store.storeId];
          return {
            storeId: store.storeId,
            cartId: cartId || '',
            storeName: store.name,
            logoIcon: store.logoIcon,
            logoColor: store.logoColor,
            baseUrl: store.baseUrl,
          };
        });

        setCarts(cartsWithInfo);
      }
    } catch (error) {
      console.error("[Carts Dropdown] Error fetching store info:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Always fetch store info to show all stores
    fetchStoreInfo();
  }, [cartIds]);

  const cartCount = carts.filter(c => c.cartId).length; // Count only stores with active carts
  const totalStores = carts.length;

  // Handle Edit button click
  const handleEditClick = () => {
    if (editMode === 'idle') {
      setEditMode('confirm');
      // Reset after 3 seconds if not clicked again
      setTimeout(() => setEditMode('idle'), 3000);
    } else if (editMode === 'confirm') {
      // Get fresh config from localStorage right before showing editor
      setCurrentConfig(getMarketplaceConfig());
      setShowEditor(true);
      setEditMode('idle');
    }
  };

  // Handle Reset button click
  const handleResetClick = () => {
    if (resetMode === 'idle') {
      setResetMode('confirm');
      // Reset after 3 seconds if not clicked again
      setTimeout(() => setResetMode('idle'), 3000);
    } else if (resetMode === 'confirm') {
      // Reset to default
      resetMarketplaceConfig();
      setResetMode('idle');
      setOpen(false);
    }
  };

  // Handle saving edited config
  const handleSaveConfig = (newConfig: any[]) => {
    setMarketplaceConfig(newConfig);
  };

  if (totalStores === 0) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled || isLoading}
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive text-secondary-foreground shadow-xs hover:bg-secondary/80 dark:border-none border-border dark:bg-secondary h-8 rounded-full border bg-transparent w-auto p-1 pl-1.5 pr-1.5 sm:pr-3"
        >
          <div className="flex -space-x-2 mr-1.5">
            {carts.slice(0, 2).map((cart, index) => (
              <div
                key={cart.storeId}
                className="w-6 h-6 rounded-full ring-2 ring-background flex items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: cart.logoColor || "#000",
                }}
              >
                {cart.logoIcon ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: cart.logoIcon }}
                    className="w-4 h-4 flex items-center justify-center"
                    style={{
                      filter: `hue-rotate(${cart.logoColor || "0"}deg)`,
                    }}
                  />
                ) : (
                  <ShoppingCart className="w-3 h-3 text-white" />
                )}
              </div>
            ))}
          </div>
          {totalStores > 2 ? (
            <span className="text-xs text-muted-foreground">
              +{totalStores - 2}
            </span>
          ) : (
            <span className="hidden sm:inline text-sm text-muted-foreground whitespace-nowrap">
              <strong className="font-medium text-foreground">{totalStores}</strong> {totalStores === 1 ? 'cart' : 'carts'}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        {carts.map((cart, index) => (
          <div key={cart.storeId}>
            {index > 0 && <div className="h-2" />}
            <div className="flex items-center justify-between gap-2">
              {/* Left: Store info - clickable to go to store */}
              <div

                className="flex items-center gap-1 flex-1 px-1.5 py-0 rounded-md"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: cart.logoIcon ? (cart.logoColor || "#e5e7eb") : "#f3f4f6",
                    border: cart.logoIcon ? "none" : "2px solid #e5e7eb",
                  }}
                >
                  {cart.logoIcon ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: cart.logoIcon }}
                      className="w-4 h-4"
                      style={{
                        filter: `hue-rotate(${cart.logoColor || "0"}deg)`,
                      }}
                    />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                  )}
                </div>
                <span className="font-medium truncate text-sm">
                  {cart.storeName || cart.baseUrl || "Unknown Store"}
                </span>
              </div>

              {/* Right: Button group with cart and external link */}
              <div className="flex items-center gap-3">
                {/* Cart icon - shows/creates cart */}
                <Button
                  onClick={() => {
                    onCartSelect(cart.storeName || "Store", cart.storeId);
                    setOpen(false);
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Show cart"
                >
                  <ShoppingBag className="size-3.5 opacity-60" />
                </Button>

                {/* External link - opens in new tab */}
                <Button
                  onClick={() => {
                    if (cart.baseUrl) {
                      window.open(cart.baseUrl, "_blank");
                    }
                    setOpen(false);
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Open in new tab"
                >
                  <ExternalLink className="size-3.5 opacity-60" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Separator before action buttons */}
        <DropdownMenuSeparator className="my-2" />

        {/* Edit button */}
        <Button
          onClick={handleEditClick}
          variant="ghost"
          className="w-full justify-start text-sm"
        >
          <Edit3 className="size-4 mr-2" />
          {editMode === 'confirm' ? 'Are you sure?' : 'Edit'}
        </Button>

        {/* Set to Default button - only show if config is custom */}
        {isCustomConfig && (
          <Button
            onClick={handleResetClick}
            variant="ghost"
            className="w-full justify-start text-sm"
          >
            <RotateCcw className="size-4 mr-2" />
            {resetMode === 'confirm' ? 'Are you sure?' : 'Set to Default'}
          </Button>
        )}
      </DropdownMenuContent>

      {/* Config Editor Dialog */}
      <MarketplaceConfigEditor
        open={showEditor}
        onOpenChange={setShowEditor}
        currentConfig={currentConfig}
        onSave={handleSaveConfig}
      />
    </DropdownMenu>
  );
}
