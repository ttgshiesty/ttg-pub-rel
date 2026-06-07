/**
 * itemDb.ts — Local item database backed by client/src/data/items/*.json.
 *
 * All item JSON files are loaded at build time (Vite eager import).
 * Each record has: id, name{en+20 langs}, description, type, rarity, value, weightKg,
 * stackSize, effects, vendors, crafting_components, recyclesInto, salvagesInto,
 * repairCost, repairMaterials, imageFilename, tip, foundIn, blueprintLocked,
 * isWeapon, modSlots, upgradeCost, upgradesTo, used_in, stat_block
 *
 * Usage:
 *   import { getItemData, getItemImg, enrichItem, getItemName, RARITY_COLOR } from '@/lib/itemDb'
 *   const data  = getItemData('venator_ii')     // full JSON record
 *   const img   = getItemImg('venator_ii')      // '/items/venator_ii.webp'
 *   const item  = enrichItem(apiItem)           // merges live data with local JSON
 *   const color = RARITY_COLOR['Legendary']     // '#ffcc00'
 */

import METAFORGE_ITEMS from '../../data/metaforge-items.json';
import { assetUrl } from './assetUrl';
import {
  getAllGameAssetMappings,
  getExplicitGameAssetValues,
  getGameAssetCandidateItemIds,
  getItemIdByWeaponAssetId,
} from './gameAssetMap';

// ─── rarity color tokens (exact ARC Raiders palette) ─────────────────────────
export const RARITY_COLOR: Record<string, string> = {
  Legendary: '#ffcc00',
  Epic: '#c43198',
  Rare: '#01abf4',
  Uncommon: '#25bb55',
  Common: '#6c6b6a',
  // lowercase aliases
  legendary: '#ffcc00',
  epic: '#c43198',
  rare: '#01abf4',
  uncommon: '#25bb55',
  common: '#6c6b6a',
};

// ─── rarity background images ─────────────────────────────────────────────────
// Only Blueprint keeps an image. All others use color fills via CSS.
export const RARITY_BG: Record<string, string> = {
  Blueprint: assetUrl('/raritybg/blueprint_bg.png'),
  // lowercase aliases
  blueprint: assetUrl('/raritybg/blueprint_bg.png'),
};

// ─── rarity CSS gradients (fallback when images not available) ───────────────
export const RARITY_GRADIENT: Record<string, string> = {
  Legendary: 'linear-gradient(135deg, #1a1500 0%, #2d2400 50%, #4a3d00 100%)',
  Epic: 'linear-gradient(135deg, #1a0015 0%, #2d0024 50%, #4a003d 100%)',
  Rare: 'linear-gradient(135deg, #00151a 0%, #00242d 50%, #003d4a 100%)',
  Uncommon: 'linear-gradient(135deg, #001a0d 0%, #002d17 50%, #004a26 100%)',
  Common: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2a2a2a 100%)',
  Blueprint: 'linear-gradient(135deg, #0d1419 0%, #142029 50%, #1a2d3d 100%)',
  // lowercase aliases
  legendary: 'linear-gradient(135deg, #1a1500 0%, #2d2400 50%, #4a3d00 100%)',
  epic: 'linear-gradient(135deg, #1a0015 0%, #2d0024 50%, #4a003d 100%)',
  rare: 'linear-gradient(135deg, #00151a 0%, #00242d 50%, #003d4a 100%)',
  uncommon: 'linear-gradient(135deg, #001a0d 0%, #002d17 50%, #004a26 100%)',
  common: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2a2a2a 100%)',
  blueprint: 'linear-gradient(135deg, #0d1419 0%, #142029 50%, #1a2d3d 100%)',
};

// ─── Get rarity background (image if exists, else gradient) ───────────────────
export function getrarityBackground(rarity?: string): string {
  const r = rarity || 'Common';
  // Check if image exists by trying to construct URL - fallback to gradient
  return RARITY_GRADIENT[r] || RARITY_GRADIENT.Common;
}

// ─── Build id / asset-id → item record maps ───────────────────────────────────
const ITEM_DB: Record<string, any> = {};
const ITEM_ASSET_DB: Record<string, any> = {};
const RAW_ITEM_MODULES = import.meta.glob('../data/items/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, any>;
const RAW_ITEM_LIST: any[] = Object.values(RAW_ITEM_MODULES);
const METAFORGE_ITEM_LIST: any[] = Array.isArray(METAFORGE_ITEMS)
  ? METAFORGE_ITEMS
  : (METAFORGE_ITEMS as any).items || (METAFORGE_ITEMS as any).data || [];
const METAFORGE_ITEM_DB: Record<string, any> = {};

const indexItemId = (id: string, record: any) => {
  ITEM_DB[id] = record;
  ITEM_DB[id.toLowerCase()] = record;
  ITEM_DB[id.replace(/-/g, '_')] = record;
  ITEM_DB[id.replace(/_/g, '-')] = record;
};

for (const record of METAFORGE_ITEM_LIST) {
  if (record?.id) {
    METAFORGE_ITEM_DB[record.id] = record;
    METAFORGE_ITEM_DB[record.id.toLowerCase()] = record;
    METAFORGE_ITEM_DB[record.id.replace(/-/g, '_')] = record;
    METAFORGE_ITEM_DB[record.id.replace(/_/g, '-')] = record;
  }
}

for (const record of RAW_ITEM_LIST) {
  const mfRecord = record?.id
    ? METAFORGE_ITEM_DB[record.id] ??
      METAFORGE_ITEM_DB[record.id.replace(/_/g, '-')] ??
      METAFORGE_ITEM_DB[record.id.replace(/-/g, '_')]
    : null;
  const mergedRecord = mfRecord ? { ...mfRecord, ...record } : record;
  if (record?.id) {
    indexItemId(record.id, mergedRecord);
  }
  const assetIds = [
    mergedRecord?.game_asset_id,
    mergedRecord?.gameAssetId,
    mergedRecord?.assetId,
    mergedRecord?.weaponAssetId,
  ].filter((value) => value !== undefined && value !== null && value !== '');
  for (const assetId of assetIds) {
    ITEM_ASSET_DB[String(assetId)] = mergedRecord;
  }
}

for (const record of METAFORGE_ITEM_LIST) {
  if (!record?.id || ITEM_DB[record.id]) continue;
  indexItemId(record.id, record);
}

for (const mapping of getAllGameAssetMappings()) {
  const matchedItem = mapping.candidateItemIds
    .map((candidateId) => ITEM_DB[candidateId] || ITEM_DB[candidateId.toLowerCase()])
    .find(Boolean);
  if (!matchedItem) continue;
  for (const assetId of [mapping.gameAssetId, mapping.baseGameAssetId]) {
    if (assetId === undefined || assetId === null || assetId === 0) continue;
    ITEM_ASSET_DB[String(assetId)] = matchedItem;
  }
}

for (const [itemId, assetId] of Object.entries(getExplicitGameAssetValues())) {
  const matchedItem = ITEM_DB[itemId] || ITEM_DB[itemId.toLowerCase()];
  if (!matchedItem || assetId === undefined || assetId === null) continue;
  ITEM_ASSET_DB[String(assetId)] = matchedItem;
}

/** Return the full local item JSON by itemId slug, or null */
export function getItemData(itemId: string | undefined | null): any | null {
  if (!itemId) return null;
  const direct =
    ITEM_DB[itemId] ??
    ITEM_DB[itemId.toLowerCase()] ??
    ITEM_ASSET_DB[String(itemId)];
  if (direct) return direct;
  for (const candidateId of getGameAssetCandidateItemIds(itemId)) {
    const mapped = ITEM_DB[candidateId] ?? ITEM_DB[candidateId.toLowerCase()];
    if (mapped) return mapped;
  }
  return null;
}

/** Return item metadata by ARC/MetaForge game asset id, when present in items-master. */
export function getItemDataByGameAssetId(
  assetId: string | number | undefined | null,
): any | null {
  if (assetId === undefined || assetId === null || assetId === '') return null;

  // First check explicit weapon asset ID mapping from ArcTracker API
  const explicitItemId = getItemIdByWeaponAssetId(assetId);
  if (explicitItemId) {
    const explicitItem =
      ITEM_DB[explicitItemId] ?? ITEM_DB[explicitItemId.toLowerCase()];
    if (explicitItem) return explicitItem;
  }

  // Fall back to general game asset lookup
  const direct = ITEM_ASSET_DB[String(assetId)];
  if (direct) return direct;
  for (const candidateId of getGameAssetCandidateItemIds(assetId)) {
    const mapped = ITEM_DB[candidateId] ?? ITEM_DB[candidateId.toLowerCase()];
    if (mapped) return mapped;
  }
  return null;
}

/** Normalise an itemId / name to the snake_case slug used by public image files */
function toImgSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/** Convert item id to the lowercase weapon filename used in S3. */
function toWeaponFilename(itemId: string): string {
  return toImgSlug(itemId);
}

/**
 * Resolve local image path — returns the .webp variant (preferred, smaller).
 * Weapons and non-weapons use lowercase filenames in S3.
 * Non-weapons use lowercase slugs under /items/.
 */
export function getItemImg(itemId: string | undefined | null): string | null {
  if (!itemId) return null;
  const record = ITEM_DB[itemId] || ITEM_DB[itemId.toLowerCase()];
  if (!record) return null;

  // Try imageFilename first, then construct from id
  if (record.imageFilename) {
    return assetUrl(record.imageFilename);
  }

  // Fallback: construct from id using assetUrl
  return assetUrl(`/items/${itemId}.webp`);
}

/** Webp variant — all item images are .webp */
export function getItemImgWebp(
  itemId: string | undefined | null,
): string | null {
  if (!itemId) return null;
  return assetUrl(`/items/${toImgSlug(itemId)}.webp`);
}

/**
 * Full image resolution chain: local webp (case-insensitive) → local png → CDN icon from DB.
 * Returns an ordered array of URLs to try, stopping at first success.
 */
export function getItemImgSrcs(
  itemId: string | undefined | null,
  extra?: string | null,
): string[] {
  const srcs: string[] = [];
  if (extra) srcs.push(extra);
  if (itemId) {
    const local = getItemData(itemId);
    const isWeapon =
      local?.isWeapon || local?.type?.toLowerCase().includes('weapon');
    if (isWeapon) {
      srcs.push(assetUrl(`/items/${toWeaponFilename(itemId)}.webp`));
    }
    const slug = toImgSlug(itemId);
    srcs.push(assetUrl(`/items/${slug}.webp`));
    const dbIcon = (ITEM_DB[itemId] ?? ITEM_DB[itemId.toLowerCase()])?.icon;
    if (dbIcon) srcs.push(dbIcon);
  }
  return srcs.filter(Boolean);
}

/** @deprecated All images are now in /items — use getItemImg instead */
export function getItemImgFallback(
  itemId: string | undefined | null,
): string | null {
  return getItemImg(itemId);
}

/** @deprecated All images are now in /items — use getItemImg instead */
export function getItemImgUpscaled(
  itemId: string | undefined | null,
): string | null {
  return getItemImg(itemId);
}

/**
 * Enrich a live API item (from ArcTracker stash/loadout) with local JSON metadata.
 * Preserves all live fields (durabilityPercent, quantity, attachments) and fills in
 * rarity, type, value, effects, weightKg, tip, foundIn, vendors from local DB when absent.
 */
export function enrichItem(apiItem: any): any {
  if (!apiItem) return apiItem;
  const id = apiItem.itemId ?? apiItem.itemID ?? apiItem.id ?? '';
  const assetId =
    apiItem.game_asset_id ??
    apiItem.gameAssetId ??
    apiItem.assetId ??
    apiItem.weaponAssetId;
  const local = getItemData(id) ?? getItemDataByGameAssetId(assetId);
  if (!local) return apiItem;

  return {
    ...apiItem,
    name:
      apiItem.name ??
      (typeof local.name === 'object' ? local.name?.en : local.name) ??
      '',
    rarity: apiItem.rarity ?? local.rarity ?? 'Common',
    type: apiItem.type ?? local.type ?? local.item_type ?? '',
    item_type: apiItem.item_type ?? local.item_type ?? local.type ?? '',
    subcategory: apiItem.subcategory ?? local.subcategory ?? '',
    value: apiItem.value ?? local.value ?? 0,
    marketValue: apiItem.marketValue ?? apiItem.value ?? local.value ?? 0,
    weightKg: apiItem.weightKg ?? local.weightKg ?? 0,
    stackSize: apiItem.stackSize ?? local.stackSize ?? 1,
    icon: apiItem.icon ?? apiItem.imageUrl ?? local.icon ?? local.imageUrl ?? '',
    imageUrl: apiItem.imageUrl ?? apiItem.icon ?? local.imageUrl ?? local.icon ?? '',
    game_asset_id:
      apiItem.game_asset_id ??
      apiItem.gameAssetId ??
      apiItem.assetId ??
      local.game_asset_id ??
      local.gameAssetId ??
      local.assetId ??
      null,
    loadout_slots:
      apiItem.loadout_slots ?? apiItem.loadoutSlots ?? local.loadout_slots ?? [],
    workbench: apiItem.workbench ?? local.workbench ?? null,
    ammo_type: apiItem.ammo_type ?? apiItem.ammoType ?? local.ammo_type ?? '',
    shield_type:
      apiItem.shield_type ?? apiItem.shieldType ?? local.shield_type ?? '',
    loot_area: apiItem.loot_area ?? apiItem.lootArea ?? local.loot_area ?? '',
    flavor_text:
      apiItem.flavor_text ?? apiItem.flavorText ?? local.flavor_text ?? '',
    guide_links: apiItem.guide_links ?? apiItem.guideLinks ?? local.guide_links ?? [],
    guide_url: apiItem.guide_url ?? apiItem.guideUrl ?? local.guide_url ?? null,
    article: apiItem.article ?? local.article ?? null,
    sources: apiItem.sources ?? local.sources ?? null,
    locations: apiItem.locations ?? local.locations ?? [],
    isWeapon: apiItem.isWeapon ?? local.isWeapon ?? false,
    description:
      apiItem.description ??
      (typeof local.description === 'object'
        ? local.description?.en
        : local.description) ??
      '',
    effects: apiItem.effects ?? local.effects ?? {},
    vendors: apiItem.vendors ?? local.vendors ?? [],
    tip: apiItem.tip ?? local.tip ?? '',
    foundIn: apiItem.foundIn ?? local.foundIn ?? [],
    modSlots: apiItem.modSlots ?? local.modSlots ?? [],
    upgradesTo: apiItem.upgradesTo ?? local.upgradesTo ?? null,
    stat_block: apiItem.stat_block ?? local.stat_block ?? null,
    crafting_components:
      apiItem.crafting_components ?? local.crafting_components ?? [],
    recyclesInto: apiItem.recyclesInto ?? local.recyclesInto ?? [],
  };
}

/** Get the English name from a live API item, falling back to local DB */
export function getItemName(apiItem: any): string {
  if (!apiItem) return 'Unknown';
  if (typeof apiItem.name === 'string' && apiItem.name) return apiItem.name;
  if (typeof apiItem.name === 'object' && apiItem.name?.en)
    return apiItem.name.en;
  const id = apiItem.itemId ?? apiItem.itemID ?? apiItem.id;
  const local = getItemData(id);
  if (local?.name) {
    return typeof local.name === 'string' ? local.name : (local.name.en ?? '');
  }
  return apiItem.itemName ?? 'Unknown';
}

/** All items as a flat array (useful for search/autocomplete) */
export const ALL_ITEMS: any[] = RAW_ITEM_LIST;

export { ITEM_DB };
