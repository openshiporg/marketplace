"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, ShoppingBag, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  useEffect(() => {
    const fetchStoreInfo = async () => {
      setIsLoading(true);
      try {
        // Fetch store information
        const response = await fetch("/api/mcp-transport/http", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

          // Show ALL stores from config, with cart info if available
          const cartsWithInfo: Cart[] = stores.map((store: any) => {
            const cartId = cartIds[store.storeId];
            return {
              storeId: store.storeId,
              cartId: cartId || '', // Empty string if no cart
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

    // Always fetch store info to show all stores
    fetchStoreInfo();
  }, [cartIds]);

  const cartCount = carts.filter(c => c.cartId).length; // Count only stores with active carts
  const totalStores = carts.length;

  if (totalStores === 0) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled || isLoading}
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive text-secondary-foreground shadow-xs hover:bg-secondary/80 dark:border-none gap-1.5 px-3 has-[>svg]:px-4 border-border dark:bg-secondary h-8 rounded-full border bg-transparent"
        >
          <div className="flex -space-x-1.5 mr-1">
            {carts.slice(0, 4).map((cart, index) => (
              <div
                key={cart.storeId}
                className="bg-muted/40 rounded-full border ring-1 ring-background flex items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: cart.logoColor || "#000",
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
                  <ShoppingCart className="w-3 h-3 text-white" />
                )}
              </div>
            ))}
          </div>
           <p className="text-sm text-muted-foreground whitespace-nowrap">
            <strong className="font-medium text-foreground">{totalStores}</strong> {totalStores === 1 ? 'cart' : 'carts'}
          </p>
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: cart.logoColor || "#000",
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
                    <ShoppingCart className="h-4 w-4 text-white" />
                  )}
                </div>
                <span className="font-medium truncate text-sm">
                  {cart.storeName || "Unknown Store"}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
