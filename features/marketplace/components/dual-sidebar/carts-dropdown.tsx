"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ShoppingCart, ShoppingBag, ExternalLink, ListFilter, MoreVertical, Plus, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  getDefaultMarketplaceConfig,
  getMarketplaceConfig,
  setMarketplaceConfig,
  resetMarketplaceConfig,
  isDefaultConfig,
  MARKETPLACE_CONFIG_UPDATED_EVENT,
  MARKETPLACE_STORAGE_KEY,
  type MarketplaceStore,
} from "@/lib/marketplace-storage";
import { StoreEditor } from "./store-editor-redesigned";
import { StoreLogo } from "../store-logo";
import { getStorePlatformLabel } from "@/lib/store-platform";

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
  const [showEditor, setShowEditor] = useState(false);
  const [startAdding, setStartAdding] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<MarketplaceStore[]>([]);
  const [isCustomConfig, setIsCustomConfig] = useState(false);
  const latestStoreInfoRequest = useRef(0);

  // Check if config is custom (modified from default)
  useEffect(() => {
    if (open) {
      setIsCustomConfig(!isDefaultConfig());
    }
  }, [open]);

  const fetchStoreInfo = useCallback(async () => {
    const requestId = ++latestStoreInfoRequest.current;
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

        // A request made before a config edit may finish last. Ignore it so
        // bundled stores cannot overwrite the user's newer store list.
        if (requestId === latestStoreInfoRequest.current) {
          setCarts(cartsWithInfo);
        }
      }
    } catch (error) {
      if (requestId === latestStoreInfoRequest.current) {
        console.error("[Carts Dropdown] Error fetching store info:", error);
      }
    } finally {
      if (requestId === latestStoreInfoRequest.current) {
        setIsLoading(false);
      }
    }
  }, [cartIds]);

  // Refresh this tab after an edit and other tabs after a storage event.
  useEffect(() => {
    const handleConfigUpdate = () => {
      const config = getMarketplaceConfig();
      setIsCustomConfig(!isDefaultConfig());
      setCurrentConfig(config);
      // Reflect additions/removals immediately; the request below only enriches
      // these entries with live names and logos. Source IDs are origin/profile
      // identities and must never be reconstructed from array position.
      setCarts(currentCarts => config.map((store) => {
        const current = currentCarts.find(cart => cart.storeId === store.id);
        return {
          storeId: store.id,
          cartId: cartIds[store.id] || '',
          storeName: store.name || store.storeName || current?.storeName,
          logoIcon: current?.logoIcon,
          logoColor: current?.logoColor,
          baseUrl: store.baseUrl,
          platform: store.platform,
        };
      }));
      fetchStoreInfo();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === MARKETPLACE_STORAGE_KEY) handleConfigUpdate();
    };

    window.addEventListener(MARKETPLACE_CONFIG_UPDATED_EVENT, handleConfigUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(MARKETPLACE_CONFIG_UPDATED_EVENT, handleConfigUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchStoreInfo, cartIds]);

  useEffect(() => {
    fetchStoreInfo();
  }, [fetchStoreInfo]);

  const totalStores = carts.length;

  const openDirectory = (addStore = false) => {
    setCurrentConfig(getMarketplaceConfig());
    setStartAdding(addStore);
    setShowEditor(true);
    setOpen(false);
  };

  // Handle saving edited config
  const handleSaveConfig = (newConfig: MarketplaceStore[]) => {
    return setMarketplaceConfig(newConfig);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled || isLoading}
          className="ml-1.5 flex shrink-0 items-center gap-1.5 rounded-[6px] px-1 py-0.5 text-left outline-none transition-colors duration-150 hover:bg-hover disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="flex -space-x-1">
            {totalStores === 0 && (
              <span className="flex size-3.5 items-center justify-center rounded-full bg-inset text-ink-3 shadow-[0_0_0_1.5px_var(--canvas)]">
                <StoreIcon className="size-2.5" />
              </span>
            )}
            {carts.slice(0, 3).map((cart) => (
              <StoreLogo
                key={cart.storeId}
                logoIcon={cart.logoIcon}
                logoColor={cart.logoColor}
                className="pointer-events-none size-3.5 rounded-full bg-surface shadow-[0_0_0_1.5px_var(--canvas)]"
                iconClassName="size-2.5 [&>svg]:pointer-events-none"
                fallback={<ShoppingCart className="size-2.5 shrink-0 text-ink-3" />}
              />
            ))}
          </span>
          <span className="whitespace-nowrap text-[12px] text-ink-2">
            {totalStores} {totalStores === 1 ? 'store' : 'stores'}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1.5">
        <div className="px-1.5 pb-1 pt-0.5 font-mono text-[10px] uppercase tracking-[.08em] text-ink-3">Store directory</div>
        {carts.map((cart, index) => {
          return (
            <div key={cart.storeId}>
              {index > 0 && <div className="mx-1 h-px bg-line" />}
              <div className="group flex items-center justify-between gap-2 py-1">
                {/* Store Info - always visible */}
                <div
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[7px] px-1.5 py-1 transition-colors duration-150 hover:bg-hover"
                  onClick={() => {
                    onCartSelect(cart.storeName || "Store", cart.storeId);
                    setOpen(false);
                  }}
                >
                  <StoreLogo
                    logoIcon={cart.logoIcon}
                    logoColor={cart.logoColor}
                    className="size-7 rounded-control bg-inset shadow-hairline"
                    iconClassName="size-3.5"
                    fallback={<StoreIcon className="size-3.5 text-ink-3" />}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-[12.5px] font-medium text-ink">
                      {cart.storeName || cart.baseUrl || "Unknown Store"}
                    </span>
                    <span className="truncate text-[10.5px] text-ink-3">
                      {getStorePlatformLabel(cart.platform)}
                    </span>
                  </div>
                </div>

                {/* Ellipsis menu for store actions */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger asChild>
                    <button
                      type="button"
                      className="beautiful-icon-button"
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

        <div className="mx-1 my-1 h-px bg-line" />
        <div className="grid grid-cols-2 gap-1">
          <Button onClick={() => openDirectory(true)} variant="default" size="sm" className="justify-center">
            <Plus className="size-3.5" /> Add store
          </Button>
          <Button onClick={() => openDirectory(false)} variant="ghost" size="sm" className="justify-center">
            <ListFilter className="size-3.5" /> Edit directory
          </Button>
        </div>
      </DropdownMenuContent>

      {/* Store Editor Dialog */}
      <StoreEditor
        open={showEditor}
        onOpenChange={(nextOpen) => {
          setShowEditor(nextOpen);
          if (!nextOpen) setStartAdding(false);
        }}
        currentConfig={currentConfig}
        admittedConfig={getDefaultMarketplaceConfig()}
        onSave={handleSaveConfig}
        cartsData={carts}
        onCartSelect={onCartSelect}
        onResetToDefault={resetMarketplaceConfig}
        isDefaultConfig={!isCustomConfig}
        startAdding={startAdding}
      />
    </DropdownMenu>
  );
}
