import { safeHttpUrl } from '@/lib/safe-content';
import type { SlimProduct, SlimModifierGroup } from '../types';

/** Parse a source money value to dollars. Numbers are minor units; strings are source-formatted ("$1,234.50"). */
export function toDollars(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value / 100 : undefined;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

const SIZE_ORDER: Record<string, number> = { XXS: 1, XS: 2, S: 3, M: 4, L: 5, XL: 6, XXL: 7, XXXL: 8 };
const sortValues = (title: string, values: string[]) =>
  [...values].sort((a, b) => (title.toLowerCase() === 'size'
    ? (SIZE_ORDER[a] ?? 999) - (SIZE_ORDER[b] ?? 999)
    : a.localeCompare(b)));

/** Reduce an adapter Product to the small, display-only shape the browser runtime needs. */
export function slimProduct(p: any, baseUrl?: string): SlimProduct {
  const optionValues = new Map<string, Set<string>>();
  for (const variant of p.variants ?? []) {
    for (const option of variant.options ?? []) {
      const name = String(option.name ?? '').trim();
      const value = String(option.value ?? '').trim();
      if (!name || !value) continue;
      if (!optionValues.has(name)) optionValues.set(name, new Set());
      optionValues.get(name)!.add(value);
    }
  }
  const optionId = (name: string) => `opt_${p.id}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  const currency = p.variants?.find((v: any) => v.currency)?.currency || 'USD';
  const thumbnail = safeHttpUrl(p.thumbnail, baseUrl);

  const restaurantMeta = p.metadata?.vertical === 'restaurant' || p.metadata?.restaurant ? p.metadata?.restaurant || {} : undefined;
  let restaurant: SlimProduct['restaurant'];
  if (restaurantMeta) {
    const modifiers: any[] = Array.isArray(restaurantMeta.modifiers) ? restaurantMeta.modifiers : [];
    const groups: SlimModifierGroup[] = Array.from(new Set(modifiers.map((m) => m.modifierGroup || 'other'))).map((groupId) => {
      const choices = modifiers.filter((m) => (m.modifierGroup || 'other') === groupId);
      const first = choices[0] || {};
      return {
        id: String(groupId),
        label: String(first.modifierGroupLabel || groupId),
        required: !!first.required,
        min: first.required ? Math.max(1, first.minSelections || 1) : Math.max(0, first.minSelections || 0),
        max: Math.max(1, first.maxSelections || choices.length || 1),
        choices: choices.map((m) => ({
          id: String(m.id), name: String(m.name ?? ''), group: String(groupId),
          price: (Number(m.priceAdjustment) || 0) / 100, defaultSelected: !!m.defaultSelected,
        })),
      };
    });
    restaurant = {
      category: restaurantMeta.category?.name,
      cartAvailable: restaurantMeta.cartAvailable !== false,
      groups,
      prepTime: restaurantMeta.prepTime ? String(restaurantMeta.prepTime) : undefined,
      calories: restaurantMeta.calories ? String(restaurantMeta.calories) : undefined,
      dietaryFlags: Array.isArray(restaurantMeta.dietaryFlags) ? restaurantMeta.dietaryFlags.map(String) : [],
    };
  }

  return {
    id: String(p.id),
    title: String(p.title ?? ''),
    description: p.description ? String(p.description) : undefined,
    images: thumbnail ? [thumbnail] : [],
    currency,
    options: Array.from(optionValues, ([title, values]) => ({ id: optionId(title), title, values: sortValues(title, [...values]) })),
    variants: (p.variants ?? []).map((v: any) => ({
      id: String(v.id),
      title: String(v.title ?? ''),
      price: toDollars(v.price),
      inStock: (v.inventoryQuantity ?? 1) > 0 || !!v.allowBackorder,
      optionValues: Object.fromEntries((v.options ?? []).map((o: any) => [optionId(String(o.name ?? '').trim()), String(o.value ?? '').trim()])),
    })),
    restaurant,
  };
}
