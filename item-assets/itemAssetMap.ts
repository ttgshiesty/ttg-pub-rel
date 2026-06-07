export type ArcItemAsset = {
  gameAssetId: string;
  itemId: string;
  name: string;
};

import arcItemAssetsJson from './arcItemAssets.json';

export const arcItemAssets = arcItemAssetsJson as ArcItemAsset[];

const COMBAT_NAME_ITEM_ALIASES: Record<string, string> = {
  fireball: 'fireball_burner',
  firefly: 'firefly_burner',
  pop: 'pop_trigger',
  snitch: 'snitch_scanner',
  wasp: 'wasp_driver',
};

export function buildItemAssetMaps(items: ArcItemAsset[] = arcItemAssets) {
  const byGameAssetId = new Map<string, ArcItemAsset>();
  const byItemId = new Map<string, ArcItemAsset>();
  const byName = new Map<string, ArcItemAsset>();

  for (const item of items) {
    byGameAssetId.set(item.gameAssetId, item);
    byItemId.set(item.itemId, item);
    byName.set(item.name.toLowerCase(), item);
  }

  for (const [alias, itemId] of Object.entries(COMBAT_NAME_ITEM_ALIASES)) {
    const item = byItemId.get(itemId);
    if (item) byName.set(alias, item);
  }

  return {
    byGameAssetId,
    byItemId,
    byName,
    getByGameAssetId: (gameAssetId: string) => byGameAssetId.get(gameAssetId),
    getByItemId: (itemId: string) => byItemId.get(itemId),
    getByName: (name: string) => byName.get(name.toLowerCase()),
  };
}

export const arcItemAssetMaps = buildItemAssetMaps();
