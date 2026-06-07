// Dynamic item loader - loads item JSON files on demand
// All items are in individual JSON files named by their ID

export interface ItemData {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  type: string;
  rarity: string;
  foundIn?: string;
  value: number;
  weightKg: number;
  stackSize: number;
  effects?: Record<string, any>;
  recyclesInto?: Record<string, any>;
  imageFilename: string;
  updatedAt: string;
}

// Cache for loaded items
const itemCache = new Map<string, ItemData>();

/**
 * Load an item by its ID
 * Example: await getItem("arc_powercell")
 */
export async function getItem(itemId: string): Promise<ItemData | null> {
  if (itemCache.has(itemId)) {
    return itemCache.get(itemId)!;
  }

  try {
    const module = await import(`./${itemId}.json`);
    const item = module.default as ItemData;
    itemCache.set(itemId, item);
    return item;
  } catch (err) {
    console.warn(`Item not found: ${itemId}`);
    return null;
  }
}

/**
 * Get item display name (English default)
 */
export function getItemName(item: ItemData, locale = 'en'): string {
  return item.name[locale] || item.name['en'] || item.id;
}

/**
 * Get item description (English default)
 */
export function getItemDescription(item: ItemData, locale = 'en'): string {
  return item.description[locale] || item.description['en'] || '';
}

/**
 * Get item image URL
 * Uses the CDN URL from the item data
 */
export function getItemImageUrl(item: ItemData): string {
  return item.imageFilename || `/items/${item.id}.webp`;
}

/**
 * Enrich stash item with full item data
 * Takes a stash item from ArcTracker API and adds full item details
 */
export async function enrichStashItem(stashItem: {
  item_id?: string;
  id?: string;
  quantity?: number;
  amount?: number;
}): Promise<{
  stashItem: typeof stashItem;
  itemData: ItemData | null;
  name: string;
  imageUrl: string;
  value: number;
  weight: number;
  totalWeight: number;
} | null> {
  const itemId = stashItem.item_id || stashItem.id;
  if (!itemId) return null;

  const itemData = await getItem(itemId);
  const quantity = stashItem.quantity || stashItem.amount || 1;

  return {
    stashItem,
    itemData,
    name: itemData ? getItemName(itemData) : itemId,
    imageUrl: itemData ? getItemImageUrl(itemData) : `/items/${itemId}.webp`,
    value: itemData?.value || 0,
    weight: itemData?.weightKg || 1,
    totalWeight: (itemData?.weightKg || 1) * quantity,
  };
}

/**
 * Enrich multiple stash items
 */
export async function enrichStashItems(
  stashItems: Array<{
    item_id?: string;
    id?: string;
    quantity?: number;
    amount?: number;
  }>,
): Promise<
  Array<ReturnType<typeof enrichStashItem> extends Promise<infer T> ? T : never>
> {
  const enriched = await Promise.all(stashItems.map(enrichStashItem));
  return enriched.filter(
    (item): item is NonNullable<typeof item> => item !== null,
  );
}

// Re-export for convenience
export { itemCache };
