// Server-side item data loader
// Loads item JSON files and provides lookup functions

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveItemAssetUrl } from '../../utils/assetUrl.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// In-memory cache for items
const itemCache = new Map();

/**
 * Load an item by ID from the JSON files
 * @param {string} itemId - The item ID (e.g., "arc_powercell")
 * @returns {object|null} The item data or null if not found
 */
export function getItem(itemId) {
  if (itemCache.has(itemId)) {
    return itemCache.get(itemId);
  }

  try {
    const filePath = join(__dirname, `${itemId}.json`);
    const data = readFileSync(filePath, 'utf-8');
    const item = JSON.parse(data);
    itemCache.set(itemId, item);
    return item;
  } catch (err) {
    // Try alternate path from client data
    try {
      const clientPath = join(
        process.cwd(),
        'client',
        'src',
        'data',
        'items',
        `${itemId}.json`,
      );
      const data = readFileSync(clientPath, 'utf-8');
      const item = JSON.parse(data);
      itemCache.set(itemId, item);
      return item;
    } catch (err2) {
      console.warn(`[Items] Item not found: ${itemId}`);
      return null;
    }
  }
}

/**
 * Get item display name
 * @param {object} item - The item data
 * @param {string} locale - Language code (default: "en")
 * @returns {string} The display name
 */
export function getItemName(item, locale = 'en') {
  return item?.name?.[locale] || item?.name?.['en'] || item?.id || 'Unknown';
}

/**
 * Get item description
 * @param {object} item - The item data
 * @param {string} locale - Language code (default: "en")
 * @returns {string} The description
 */
export function getItemDescription(item, locale = 'en') {
  return item?.description?.[locale] || item?.description?.['en'] || '';
}

/**
 * Get item image URL
 * @param {object} item - The item data
 * @returns {string} The image URL
 */
export function getItemImageUrl(item) {
  return resolveItemAssetUrl(item?.imageFilename, item?.id);
}

/**
 * Enrich stash item with full item data
 * @param {object} stashItem - Item from ArcTracker stash API
 * @returns {object|null} Enriched item data
 */
export function enrichStashItem(stashItem) {
  // "i" is the short key used in ArcTracker stash/inventory snapshot responses.
  const itemId =
    stashItem?.i || stashItem?.item_id || stashItem?.id || stashItem?.itemId;
  if (!itemId) return null;

  const itemData = getItem(itemId);
  // "q" is the short key for quantity, "d" is durability percent.
  const quantity =
    stashItem?.q || stashItem?.quantity || stashItem?.amount || 1;
  const durability = stashItem?.d ?? null;
  // "a" is the short key for attachments array.
  const attachments = stashItem?.a || stashItem?.attachments || [];

  return {
    ...stashItem,
    // Normalised fields — always present for consumers
    itemId,
    quantity,
    durability,
    attachments,
    itemData,
    name: itemData ? getItemName(itemData) : itemId,
    description: itemData ? getItemDescription(itemData) : '',
    imageUrl: itemData
      ? getItemImageUrl(itemData)
      : resolveItemAssetUrl(null, itemId),
    type: itemData?.type || 'Unknown',
    rarity: itemData?.rarity || 'Common',
    value: itemData?.value || 0,
    weight: itemData?.weightKg || 1,
    totalWeight: (itemData?.weightKg || 1) * quantity,
    stackSize: itemData?.stackSize || 1,
  };
}

/**
 * Enrich multiple stash items
 * @param {Array} stashItems - Array of stash items
 * @returns {Array} Enriched items
 */
export function enrichStashItems(stashItems) {
  if (!Array.isArray(stashItems)) return [];
  return stashItems.map(enrichStashItem).filter(Boolean);
}

/**
 * Get all loaded item IDs (for debugging)
 * @returns {Array} Array of cached item IDs
 */
export function getCachedItemIds() {
  return Array.from(itemCache.keys());
}

/**
 * Clear the item cache
 */
export function clearItemCache() {
  itemCache.clear();
}

// Default export
export default {
  getItem,
  getItemName,
  getItemDescription,
  getItemImageUrl,
  enrichStashItem,
  enrichStashItems,
  getCachedItemIds,
  clearItemCache,
};
