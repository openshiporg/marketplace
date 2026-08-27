"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  RotateCcw,
  Store as StoreIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OpenfrontLogoIcon } from "@/components/OpenfrontLogoIcon";
import { ShopifyIcon } from "@/components/ShopifyIcon";
import { StoreLogo } from "../store-logo";
import { normalizeSourceBaseUrl, sourceIdFor, type SourcePlatform } from "@/lib/source-identity";

interface Store {
  id: string;
  storeId?: string;
  cartId?: string;
  baseUrl: string;
  platform: SourcePlatform;
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
  admittedConfig: Store[];
  onSave: (newConfig: Store[]) => Store[];
  cartsData?: CartData[];
  onCartSelect?: (storeName: string, storeId: string) => void;
  onResetToDefault?: () => void;
  isDefaultConfig?: boolean;
  startAdding?: boolean;
}

type PlatformKey = "openfront" | "openfront-restaurant" | "shopify";

const PLATFORMS: Record<PlatformKey, { label: string; example: string }> = {
  openfront: { label: "Openfront E-commerce", example: "https://your-store.openship.org" },
  "openfront-restaurant": { label: "Openfront Restaurant", example: "https://your-restaurant.openship.org" },
  shopify: { label: "Shopify", example: "https://your-store.myshopify.com" },
};

const ADDABLE_PLATFORMS = ["openfront", "openfront-restaurant"] as const;

const COMING_SOON_PLATFORMS = [
  { key: "grocery", label: "Openfront Grocery", color: "#22c55e" },
  { key: "hotel", label: "Openfront Hotel", color: "#ec4899" },
  { key: "rental", label: "Openfront Rental", color: "#d946ef" },
  { key: "real-estate", label: "Openfront Real Estate", color: "#14b8a6" },
  { key: "coffee-shop", label: "Openfront Coffee Shop", color: "#92400e" },
  { key: "barbershop", label: "Openfront Barbershop", color: "#2563eb" },
  { key: "dealership", label: "Openfront Dealership", color: "#ef4444" },
  { key: "hospital", label: "Openfront Hospital", color: "#06b6d4" },
  { key: "gym", label: "Openfront Gym", color: "#8b5cf6" },
  { key: "salon", label: "Openfront Salon", color: "#a855f7" },
  { key: "construction", label: "Openfront Construction", color: "#f97316" },
  { key: "convenience", label: "Openfront Convenience", color: "#0f9f9a" },
  { key: "airline", label: "Openfront Airline", color: "#3b82f6" },
  { key: "law-firm", label: "Openfront Law Firm", color: "#7c3aed" },
  { key: "pharmacy", label: "Openfront Pharmacy", color: "#0d9488" },
] as const;

function PlatformIcon({ platform, className = "size-4" }: { platform: SourcePlatform; className?: string }) {
  if (platform === "openfront") {
    return <OpenfrontLogoIcon className={className} color="var(--signal)" suffix="-store-platform-ecommerce" />;
  }
  if (platform === "openfront-restaurant") {
    return <OpenfrontLogoIcon className={className} color="var(--orange)" suffix="-store-platform-restaurant" />;
  }
  if (platform === "shopify") return <ShopifyIcon className={`${className} text-green`} />;
  return <StoreIcon className={`${className} text-ink-3`} />;
}

function storeName(store: Store) {
  if (store.storeName || store.name) return store.storeName || store.name || "Store";
  try {
    const hostname = new URL(store.baseUrl).hostname.replace(/^www\./, "");
    const name = hostname.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "Store";
  }
}

function StoreMark({ store }: { store: Store }) {
  return (
    <StoreLogo
      logoIcon={store.logoIcon}
      logoColor={store.logoColor}
      className="size-7 rounded-control bg-inset shadow-hairline"
      iconClassName="size-3.5"
      fallback={<StoreIcon className="size-3.5 text-ink-3" />}
    />
  );
}

function StoreForm({
  initial,
  existingStoreIds,
  admittedStores,
  onCancel,
  onSubmit,
}: {
  initial?: Store;
  existingStoreIds: string[];
  admittedStores: Store[];
  onCancel: () => void;
  onSubmit: (store: Store) => void;
}) {
  const [platform, setPlatform] = useState<PlatformKey>((initial?.platform as PlatformKey) || "openfront");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl || "");
  const [name, setName] = useState(initial?.name || initial?.storeName || "");

  const error = useMemo(() => {
    if (!baseUrl) return null;
    let normalizedBaseUrl: string;
    try {
      normalizedBaseUrl = normalizeSourceBaseUrl(baseUrl);
    } catch {
      return "Enter a credential-free HTTPS URL.";
    }

    const id = sourceIdFor({ baseUrl: normalizedBaseUrl, platform });
    if (existingStoreIds.includes(id)) return "This store is already connected.";
    if (!admittedStores.some((store) => store.id === id)) {
      return "This endpoint must be admitted in marketplace.config.json first.";
    }
    return null;
  }, [admittedStores, baseUrl, existingStoreIds, platform]);

  const valid = !!baseUrl && !error;

  const save = () => {
    if (!valid) return;
    const resolvedName = name.trim() || undefined;
    const normalizedBaseUrl = normalizeSourceBaseUrl(baseUrl);
    onSubmit({
      ...initial,
      id: sourceIdFor({ baseUrl: normalizedBaseUrl, platform }),
      baseUrl: normalizedBaseUrl,
      platform,
      name: resolvedName,
      storeName: resolvedName,
    });
  };

  return (
    <>
      <div className="space-y-4 px-4 py-4">
        <div>
          <Label htmlFor="store-platform" className="text-[11.5px] font-medium text-ink-2">Platform</Label>
          <Select value={platform} onValueChange={(value: PlatformKey) => setPlatform(value)}>
            <SelectTrigger
              id="store-platform"
              autoFocus
              className="mt-1.5 h-9 w-full rounded-control bg-inset shadow-hairline"
            >
              <SelectValue>
                <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
                  <PlatformIcon platform={platform} />
                  {PLATFORMS[platform].label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ADDABLE_PLATFORMS.map((key) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <PlatformIcon platform={key} />
                    {PLATFORMS[key].label}
                  </span>
                </SelectItem>
              ))}
              <SelectSeparator className="bg-line" />
              {COMING_SOON_PLATFORMS.map((option) => (
                <SelectItem
                  key={option.key}
                  value={`openfront-${option.key}`}
                  disabled
                  className="[&>span:last-child]:min-w-0 [&>span:last-child]:flex-1"
                >
                  <span className="flex w-full min-w-0 items-center gap-2">
                    <OpenfrontLogoIcon
                      className="size-4 shrink-0"
                      color={option.color}
                      suffix={`-store-platform-${option.key}`}
                    />
                    <span className="truncate">{option.label}</span>
                    <span className="ml-auto shrink-0 pl-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
                      SOON
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="store-url" className="text-[11.5px] font-medium text-ink-2">Store URL</Label>
          <Input
            id="store-url"
            type="url"
            list="admitted-store-urls"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder={PLATFORMS[platform].example}
            className="mt-1.5"
          />
          <datalist id="admitted-store-urls">
            {admittedStores.map((store) => (
              <option key={store.id} value={store.baseUrl}>{store.name || store.storeName}</option>
            ))}
          </datalist>
          {error && <p className="mt-1.5 text-[11px] text-red">{error}</p>}
        </div>

        <div>
          <Label htmlFor="store-name" className="text-[11.5px] font-medium text-ink-2">Display name <span className="text-ink-3">optional</span></Label>
          <Input
            id="store-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Derived from the store URL"
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line bg-inset px-3 py-2.5">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="button" size="sm" disabled={!valid} onClick={save}>{initial ? "Save changes" : "Add store"}</Button>
      </div>
    </>
  );
}

export function StoreEditor({
  open,
  onOpenChange,
  currentConfig,
  admittedConfig,
  onSave,
  cartsData,
  onResetToDefault,
  isDefaultConfig,
  startAdding = false,
}: StoreEditorProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStores(currentConfig.map((store) => ({ ...store })));
  }, [open, currentConfig]);

  // Opening mode is one-shot. Config events emitted by a successful save must
  // not reopen the add/edit form while the dialog remains mounted.
  useEffect(() => {
    if (!open) return;
    setEditingIndex(null);
    setAdding(startAdding);
    setSaveError(null);
  }, [open, startAdding]);

  useEffect(() => {
    if (!open || !cartsData) return;
    setStores((current) => current.map((store) => {
      const metadata = cartsData.find((cart) =>
        cart.storeId === store.id ||
        (store.storeId && cart.storeId === store.storeId) ||
        (cart.baseUrl && store.baseUrl === cart.baseUrl)
      );
      if (!metadata) return store;
      return {
        ...store,
        storeId: metadata.storeId || store.storeId,
        cartId: metadata.cartId,
        logoIcon: metadata.logoIcon || store.logoIcon,
        logoColor: metadata.logoColor || store.logoColor,
        storeName: store.storeName || store.name || metadata.storeName,
      };
    }));
  }, [open, cartsData]);

  const persist = (next: Store[]): boolean => {
    try {
      const saved = onSave(next);
      setStores(saved);
      setSaveError(null);
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save the store directory.");
      return false;
    }
  };

  const editing = editingIndex !== null ? stores[editingIndex] : undefined;
  const formOpen = adding || editingIndex !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] gap-0 p-0">
        <div className="flex min-h-12 items-center border-b border-line px-3 pr-12">
          {formOpen ? (
            <button
              type="button"
              onClick={() => { setAdding(false); setEditingIndex(null); }}
              className="mr-2 flex size-6 items-center justify-center rounded-[6px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
              aria-label="Back to stores"
            >
              <ArrowLeft className="size-3.5" />
            </button>
          ) : null}
          <div className="min-w-0">
            <DialogTitle className="text-[13px] font-semibold text-ink">{adding ? "Add store" : editing ? "Edit store" : "Store directory"}</DialogTitle>
            {formOpen ? (
              <DialogDescription className="sr-only">Configure the store connection.</DialogDescription>
            ) : (
              <DialogDescription className="text-[11px] leading-normal text-ink-3">{stores.length} connected {stores.length === 1 ? "store" : "stores"}</DialogDescription>
            )}
          </div>
          {!formOpen && !isDefaultConfig && onResetToDefault ? (
            <button
              type="button"
              onClick={() => { onResetToDefault(); onOpenChange(false); }}
              className="ml-auto flex h-6 items-center gap-1 rounded-[6px] px-2 text-[11.5px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          ) : null}
        </div>

        {saveError ? (
          <div role="alert" className="border-b border-red/20 bg-red-tint px-4 py-2 text-[11.5px] text-red">
            {saveError}
          </div>
        ) : null}

        {formOpen ? (
          <StoreForm
            initial={editing}
            existingStoreIds={stores.filter((_, index) => index !== editingIndex).map((store) => store.id)}
            admittedStores={admittedConfig}
            onCancel={() => { setAdding(false); setEditingIndex(null); setSaveError(null); }}
            onSubmit={(store) => {
              if (editingIndex !== null) {
                const next = [...stores];
                next[editingIndex] = store;
                if (persist(next)) setEditingIndex(null);
              } else {
                if (persist([...stores, store])) setAdding(false);
              }
            }}
          />
        ) : (
          <>
            <div className="max-h-72 overflow-y-auto">
              {stores.length ? stores.map((store, index) => (
                <div key={store.id} className="group flex h-12 items-center gap-2.5 border-b border-line px-3 last:border-0 hover:bg-inset">
                  <StoreMark store={store} />
                  <button type="button" onClick={() => setEditingIndex(index)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[12.5px] font-medium text-ink">{storeName(store)}</span>
                    <span className="block truncate text-[10.5px] text-ink-3">{store.baseUrl}</span>
                  </button>
                  <span className="hidden size-6 shrink-0 items-center justify-center sm:flex" title={PLATFORMS[store.platform as PlatformKey]?.label || store.platform}>
                    <PlatformIcon platform={store.platform} className="size-4" />
                  </span>
                  <a
                    href={store.baseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${storeName(store)}`}
                    className="flex size-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover hover:text-ink"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    aria-label={`Remove ${storeName(store)}`}
                    onClick={() => persist(stores.filter((_, storeIndex) => storeIndex !== index))}
                    className="flex size-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-red-tint hover:text-red"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )) : (
                <div className="flex flex-col items-center px-4 py-10 text-center">
                  <span className="mb-2 flex size-8 items-center justify-center rounded-control bg-inset text-ink-3 shadow-hairline"><StoreIcon className="size-4" /></span>
                  <p className="text-[13px] font-medium text-ink">No stores connected</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-3">Add an Openfront or Shopify store to begin.</p>
                </div>
              )}
            </div>
            <div className="border-t border-line bg-inset p-2.5">
              <Button type="button" size="sm" onClick={() => setAdding(true)} className="w-full">
                <Plus className="size-3.5" /> Add store
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
