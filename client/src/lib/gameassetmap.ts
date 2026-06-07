import GAME_ASSET_DUMP from '../../../../game_asset_dump.json';

// Explicit weaponAssetId → itemId mappings for ArcTracker API weapons
const WEAPON_ASSET_ID_TO_ITEM_ID: Record<string, string | null> = {
  '168902929': 'venator_iv',
  '-922322200': 'seeker_grenade',
  '1650182822': 'renegade_iv',
  '-1074160440': 'wolfpack',
  '1951118983': 'anvil_i',
  '1858816158': 'venator_i',
  '-853744599': 'venator_ii',
  '411757406': null, // Raider Tool - no itemId
  '331271227': 'il_toro_iv',
  '-1974459892': 'anvil_ii',
  '-1300343709': 'ferro_i',
  '-119018899': 'venator_iii',
  '1407799927': 'burletta_iv',
  '1343472835': 'hullcracker_iv',
  '-14963185': 'ferro_iv',
};

export function getItemIdByWeaponAssetId(
  weaponAssetId: number | string | undefined | null,
): string | null {
  if (weaponAssetId === undefined || weaponAssetId === null) return null;
  const key = String(weaponAssetId);
  return WEAPON_ASSET_ID_TO_ITEM_ID[key] || null;
}

type GameAssetRecord = {
  gameAssetId?: number;
  itemType?: string;
  stackable?: boolean;
  unique?: boolean;
  maxAmount?: number;
  baseGameAssetId?: number;
  qualityLevel?: number;
};

type GameAssetMapping = GameAssetRecord & {
  assetName: string;
  candidateItemIds: string[];
};

const dumpItems: Record<string, GameAssetRecord> =
  (GAME_ASSET_DUMP as any).items || {};
const dumpValues: Record<string, number> = (GAME_ASSET_DUMP as any).values || {};
const dumpInventory: any[] = Array.isArray((GAME_ASSET_DUMP as any).inventory)
  ? (GAME_ASSET_DUMP as any).inventory
  : [];

const ROMAN_BY_TIER: Record<string, string> = {
  '01': 'i',
  '02': 'ii',
  '03': 'iii',
  '04': 'iv',
  '05': 'v',
  '1': 'i',
  '2': 'ii',
  '3': 'iii',
  '4': 'iv',
  '5': 'v',
};

function uniq(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])];
}

function kebab(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function stripKnownPrefixes(assetName: string): string {
  return assetName
    .replace(/^DA_/, '')
    .replace(/^Item_/, '')
    .replace(/^OI_/, '')
    .replace(/^Unlock_Craft/, '')
    .replace(/^Recipe_Recipe_/, '')
    .replace(/^Recipe_/, '')
    .replace(/^WeaponMod_/, '')
    .replace(/^Salvage_/, '')
    .replace(/^Mat_/, '')
    .replace(/^Consumable_/, '')
    .replace(/^Throwable_/, '')
    .replace(/^Augment_/, '')
    .replace(/^Gadget_/, '');
}

function splitTierSuffix(value: string): { base: string; tier?: string } {
  const match = value.match(/[_-](0?[1-5])$/);
  if (!match) return { base: value };
  return {
    base: value.slice(0, match.index),
    tier: ROMAN_BY_TIER[match[1]],
  };
}

function recipeCandidates(assetName: string): string[] {
  if (!assetName.includes('Recipe')) return [];
  const stripped = stripKnownPrefixes(assetName);
  const { base, tier } = splitTierSuffix(stripped);
  const slug = kebab(base);
  return uniq([
    tier ? `${slug}-${tier}-recipe` : `${slug}-recipe`,
    tier ? `${slug}-${tier}-blueprint` : `${slug}-blueprint`,
    `${slug}-recipe`,
    `${slug}-blueprint`,
    slug,
  ]);
}

function unlockCandidates(assetName: string): string[] {
  if (!assetName.startsWith('DA_OI_Unlock_Craft')) return [];
  const stripped = stripKnownPrefixes(assetName);
  const slug = kebab(stripped);
  return uniq([`${slug}-recipe`, `${slug}-blueprint`, slug]);
}

function weaponModCandidates(assetName: string): string[] {
  if (!assetName.includes('WeaponMod')) return [];
  const stripped = stripKnownPrefixes(assetName)
    .replace(/^UnderBarrel_/, '')
    .replace(/^MagazineLight_Extended/, 'ExtendedLightMag')
    .replace(/^MagazineMedium_Extended/, 'ExtendedMediumMag')
    .replace(/^MagazineShotgun_Extended/, 'ExtendedShotgunMag')
    .replace(/^ShotgunMuzzle_/, '')
    .replace(/^Muzzle_Brake/, 'MuzzleBrake')
    .replace(/^Muzzle_/, '')
    .replace(/^Stock_Lightweight/, 'LightweightStock')
    .replace(/^Stock_Stable/, 'StableStock');
  const { base, tier } = splitTierSuffix(stripped);
  const slug = kebab(base);
  return uniq([
    tier ? `${slug}-${tier}` : slug,
    tier ? `${slug}-${tier}-recipe` : `${slug}-recipe`,
    tier ? `${slug}-${tier}-blueprint` : `${slug}-blueprint`,
    slug,
  ]);
}

function plainItemCandidates(assetName: string): string[] {
  const stripped = stripKnownPrefixes(assetName)
    .replace(/^LightAmmo$/, 'Light Ammo')
    .replace(/^MediumAmmo$/, 'Medium Ammo')
    .replace(/^HeavyAmmo$/, 'Heavy Ammo')
    .replace(/^ShotgunAmmo$/, 'Shotgun Ammo')
    .replace(/^LauncherAmmo$/, 'Launcher Ammo');
  const { base, tier } = splitTierSuffix(stripped);
  const slug = kebab(base);
  return uniq([tier ? `${slug}-${tier}` : slug, slug]);
}

export function getGameAssetCandidateItemIds(
  assetIdOrName: string | number | undefined | null,
): string[] {
  if (assetIdOrName === undefined || assetIdOrName === null) return [];
  const raw = String(assetIdOrName);
  const mappings = getGameAssetMappings(raw);
  if (mappings.length > 0) {
    return uniq(mappings.flatMap((mapping) => mapping.candidateItemIds));
  }
  if (raw.startsWith('DA_')) {
    return buildCandidateItemIds(raw);
  }
  return [];
}

function buildCandidateItemIds(assetName: string): string[] {
  return uniq([
    ...recipeCandidates(assetName),
    ...unlockCandidates(assetName),
    ...weaponModCandidates(assetName),
    ...plainItemCandidates(assetName),
  ]);
}

const mappingsByAssetId: Record<string, GameAssetMapping[]> = {};
const mappingsByAssetName: Record<string, GameAssetMapping> = {};

for (const [assetName, record] of Object.entries(dumpItems)) {
  const mapping: GameAssetMapping = {
    assetName,
    ...record,
    candidateItemIds: assetName.startsWith('DA_')
      ? buildCandidateItemIds(assetName)
      : [],
  };
  mappingsByAssetName[assetName] = mapping;
  for (const assetId of [record.gameAssetId, record.baseGameAssetId]) {
    if (assetId === undefined || assetId === null || assetId === 0) continue;
    const key = String(assetId);
    mappingsByAssetId[key] = mappingsByAssetId[key] || [];
    mappingsByAssetId[key].push(mapping);
  }
}

for (const item of dumpInventory) {
  if (!item?.itemAssetId || !item?.name) continue;
  const record = mappingsByAssetName[item.name] || {
    assetName: item.name,
    gameAssetId: item.itemAssetId,
    candidateItemIds: buildCandidateItemIds(item.name),
  };
  const key = String(item.itemAssetId);
  mappingsByAssetId[key] = mappingsByAssetId[key] || [];
  if (!mappingsByAssetId[key].some((mapping) => mapping.assetName === item.name)) {
    mappingsByAssetId[key].push(record);
  }
}

export function getGameAssetMappings(
  assetIdOrName: string | number | undefined | null,
): GameAssetMapping[] {
  if (assetIdOrName === undefined || assetIdOrName === null) return [];
  const key = String(assetIdOrName);
  if (mappingsByAssetName[key]) return [mappingsByAssetName[key]];
  return mappingsByAssetId[key] || [];
}

export function getAllGameAssetMappings(): GameAssetMapping[] {
  return Object.values(mappingsByAssetName);
}

export function getExplicitGameAssetValues(): Record<string, number> {
  return dumpValues;
}
