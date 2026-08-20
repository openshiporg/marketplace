"use client";

import { useEffect } from 'react';
import { getMarketplaceProfile, MARKETPLACE_PROFILE_STORAGE_KEY, MARKETPLACE_PROFILE_UPDATED_EVENT } from '@/lib/marketplace-profile';

export function MarketplaceProfileHydrator() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.marketplaceTheme = getMarketplaceProfile().theme;
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === MARKETPLACE_PROFILE_STORAGE_KEY) apply();
    };
    apply();
    window.addEventListener('storage', onStorage);
    window.addEventListener(MARKETPLACE_PROFILE_UPDATED_EVENT, apply);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(MARKETPLACE_PROFILE_UPDATED_EVENT, apply);
    };
  }, []);
  return null;
}
