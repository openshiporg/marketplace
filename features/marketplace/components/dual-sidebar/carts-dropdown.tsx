"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, ShoppingBag, ExternalLink, Edit3, MoreVertical, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  getMarketplaceConfig,
  setMarketplaceConfig,
  resetMarketplaceConfig,
  isDefaultConfig,
} from "@/lib/marketplace-storage";
import { StoreEditor } from "./store-editor-redesigned";

interface Cart {
  storeId: string;
  cartId: string;
  storeName?: string;
  logoIcon?: string;
  logoColor?: string;
  baseUrl?: string;
  platform?: string;
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
      fetchStoreInfo();
    };

    window.addEventListener('marketplaceConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('marketplaceConfigUpdated', handleConfigUpdate);
  }, []);

  const fetchStoreInfo = async () => {
    setIsLoading(true);
    try {
      const marketplaceConfig = getMarketplaceConfig();
      // No global ucpMode anymore

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

        const cartsWithInfo: Cart[] = stores.map((store: any) => {
          const cartId = cartIds[store.storeId];
          
          return {
            storeId: store.storeId,
            cartId: cartId || '',
            storeName: store.name,
            logoIcon: store.logoIcon,
            logoColor: store.logoColor,
            baseUrl: store.baseUrl,
            platform: store.platform,
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
    fetchStoreInfo();
  }, [cartIds]);

  const cartCount = carts.filter(c => c.cartId).length;
  const totalStores = carts.length;

  // Handle Edit button click
  const handleEditClick = () => {
    if (editMode === 'idle') {
      setEditMode('confirm');
      setTimeout(() => setEditMode('idle'), 3000);
    } else if (editMode === 'confirm') {
      setCurrentConfig(getMarketplaceConfig());
      setShowEditor(true);
      setEditMode('idle');
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
          <div className="flex -space-x-2 mr-1.5 overflow-hidden">
            {carts.slice(0, 2).map((cart, index) => (
              <div
                key={cart.storeId}
                className="w-6 h-6 rounded-full ring-2 ring-background flex items-center justify-center overflow-hidden pointer-events-none"
                style={{
                  backgroundColor: cart.logoColor || "#000",
                }}
              >
                {cart.logoIcon ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: cart.logoIcon }}
                    className="w-4 h-4 flex items-center justify-center [&>*]:pointer-events-none [&>*]:w-full [&>*]:h-full [&>*]:text"
                    style={{
                      filter: `hue-rotate(${cart.logoColor || "0"}deg)`,
                    }}
                  />
                ) : (
                  <ShoppingCart className="w-3 h-3 text-white flex-shrink-0" />
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
        {carts.map((cart, index) => {
          return (
            <div key={cart.storeId}>
              {index > 0 && <div className="h-px bg-border my-2" />}
              <div className="flex items-center justify-between gap-2 group">
                {/* Store Info - always visible */}
                <div
                  className="flex items-center gap-2 flex-1 min-w-0 px-1.5 py-1 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    onCartSelect(cart.storeName || "Store", cart.storeId);
                    setOpen(false);
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: cart.logoIcon
                        ? cart.logoColor || "#e5e7eb"
                        : "#f3f4f6",
                      border: cart.logoIcon ? "none" : "2px solid #e5e7eb",
                    }}
                  >
                    {cart.logoIcon ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: cart.logoIcon }}
                        className="w-3.5 h-3.5"
                        style={{
                          filter: `hue-rotate(${cart.logoColor || "0"}deg)`,
                        }}
                      />
                    ) : (
                      <StoreIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-sm truncate">
                      {cart.storeName || cart.baseUrl || "Unknown Store"}
                    </span>
                    {cart.cartId && (
                      <span className="text-xs text-muted-foreground truncate">
                        Active cart
                      </span>
                    )}
                  </div>
                </div>

                {/* Ellipsis menu for store actions */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-7 w-7 opacity-60 hover:opacity-100 hover:bg-accent rounded-md transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent sideOffset={4} alignOffset={-4}>
                    {/* View Cart */}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onCartSelect(cart.storeName || "Store", cart.storeId);
                        setOpen(false);
                      }}
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      View Cart
                    </DropdownMenuItem>

                    {/* Open in new tab */}
                    {cart.baseUrl && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(cart.baseUrl, "_blank");
                          setOpen(false);
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in new tab
                      </DropdownMenuItem>
                    )}




                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </div>
            </div>
          );
        })}

        {/* Separator */}
        <div className="h-px bg-border my-2" />

        {/* Edit button */}
        <Button
          onClick={handleEditClick}
          variant="ghost"
          className="w-full justify-start text-sm"
        >
          <Edit3 className="size-4 mr-2" />
          {editMode === 'confirm' ? 'Are you sure?' : 'Manage Stores'}
        </Button>
      </DropdownMenuContent>

      {/* Store Editor Dialog */}
      <StoreEditor
        open={showEditor}
        onOpenChange={setShowEditor}
        currentConfig={currentConfig}
        onSave={handleSaveConfig}
        cartsData={carts}
        onCartSelect={onCartSelect}
        onResetToDefault={() => {
          resetMarketplaceConfig();
          fetchStoreInfo();
        }}
        isDefaultConfig={!isCustomConfig}
      />
    </DropdownMenu>
  );
}
