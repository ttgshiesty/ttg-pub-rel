import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSET_MAP_PATHS = [
  path.resolve(__dirname, '../../asset_map.json'),
  path.resolve(__dirname, '../data/asset-map.json'),
];
const ASSET_DUMP_PATHS = [
  path.resolve(__dirname, '../../game_asset_dump.json'),
  path.resolve(__dirname, '../data/game-asset-dump.json'),
];

let cachedAssetMap = null;
let cachedAssetDump = null;
let cachedAssetDumpIndexes = null;

const ASSET_ID_FIELDS = [
  'gameAssetId',
  'game_asset_id',
  'itemAssetId',
  'item_asset_id',
  'weaponAssetId',
  'weapon_asset_id',
  'baseGameAssetId',
  'base_game_asset_id',
  'assetId',
  'asset_id',
];

function loadAssetMap() {
  if (cachedAssetMap) return cachedAssetMap;

  for (const filePath of ASSET_MAP_PATHS) {
    try {
      if (!fs.existsSync(filePath)) continue;
      cachedAssetMap = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return cachedAssetMap;
    } catch (err) {
      console.warn(`[AssetMap] Failed to load ${filePath}:`, err.message);
    }
  }

  cachedAssetMap = {};
  return cachedAssetMap;
}

export function resolveGameAssetId(gameAssetId) {
  if (gameAssetId === undefined || gameAssetId === null) return null;
  return loadAssetMap()[String(gameAssetId)] || null;
}

function loadAssetDump() {
  if (cachedAssetDump) return cachedAssetDump;

  for (const filePath of ASSET_DUMP_PATHS) {
    try {
      if (!fs.existsSync(filePath)) continue;
      cachedAssetDump = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return cachedAssetDump;
    } catch (err) {
      console.warn(`[AssetMap] Failed to load ${filePath}:`, err.message);
    }
  }

  cachedAssetDump = {};
  return cachedAssetDump;
}

function indexAssetDump() {
  if (cachedAssetDumpIndexes) return cachedAssetDumpIndexes;

  const dump = loadAssetDump();
  const byId = new Map();
  const byName = new Map();
  const addAsset = (name, asset, overwrite = true) => {
    if (!asset || typeof asset !== 'object') return;

    const normalized = {
      ...asset,
      name: asset.name || name,
    };
    const assetId = asset.gameAssetId ?? asset.itemAssetId;
    if (assetId !== undefined && assetId !== null) {
      const idKey = String(assetId);
      if (overwrite || !byId.has(idKey)) {
        byId.set(idKey, normalized);
      }
    }
    if (normalized.name) {
      if (overwrite || !byName.has(normalized.name)) {
        byName.set(normalized.name, normalized);
      }
    }
  };

  for (const [name, asset] of Object.entries(dump.items || {})) {
    addAsset(name, asset);
  }
  for (const asset of Object.values(dump.inventory || {})) {
    addAsset(asset?.name, asset, false);
  }

  cachedAssetDumpIndexes = { byId, byName };
  return cachedAssetDumpIndexes;
}

export function resolveGameAssetDetails(gameAssetIdOrName) {
  if (gameAssetIdOrName === undefined || gameAssetIdOrName === null)
    return null;

  const { byId, byName } = indexAssetDump();
  const key = String(gameAssetIdOrName);
  const assetName = resolveGameAssetId(gameAssetIdOrName) || key;
  const details = byId.get(key) || byName.get(assetName) || byName.get(key);
  if (!details) return null;

  const name = details.name || assetName;
  const baseGameAssetName = resolveGameAssetId(details.baseGameAssetId);
  return {
    ...details,
    name,
    label: humanizeAssetName(name),
    ...(baseGameAssetName
      ? {
          baseGameAssetName,
          baseGameAssetLabel: humanizeAssetName(baseGameAssetName),
        }
      : {}),
  };
}

export function humanizeAssetName(assetName) {
  if (!assetName || typeof assetName !== 'string') return null;
  return assetName
    .replace(/^DA_/, '')
    .replace(/^(Item|Inventory|OI|CharacterSkill|Emote|ModSlot)_/, '')
    .replace(/_/g, ' ')
    .replace(/\bT(\d)\b/g, 'Tier $1')
    .replace(/\bLF\b/g, 'Loadout Frame')
    .replace(/\bHoT\b/g, 'Heal Over Time')
    .replace(/\bDBNO\b/g, 'Down But Not Out')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toCamelCase(value) {
  return value.replace(/[_-]([a-z])/g, (_, char) => char.toUpperCase());
}

function assetFieldPrefix(fieldName) {
  return toCamelCase(fieldName).replace(/Id$/, '');
}

function enrichAssetField(out, source, fieldName) {
  if (!Object.prototype.hasOwnProperty.call(source, fieldName)) return;

  const assetName = resolveGameAssetId(source[fieldName]);
  const assetDetails = resolveGameAssetDetails(source[fieldName] ?? assetName);
  if (!assetName && !assetDetails) return;

  const prefix = assetFieldPrefix(fieldName);
  if (assetName) {
    out[`${prefix}Name`] = assetName;
    out[`${prefix}Label`] = humanizeAssetName(assetName);
  }
  if (assetDetails) {
    out[prefix] = assetDetails;
  }
}

export function enrichGameAssetRefs(value) {
  if (Array.isArray(value)) {
    return value.map((item) => enrichGameAssetRefs(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const out = {};
  for (const [key, itemValue] of Object.entries(value)) {
    out[key] = enrichGameAssetRefs(itemValue);
  }

  for (const fieldName of ASSET_ID_FIELDS) {
    enrichAssetField(out, value, fieldName);
  }

  return out;
}

export default {
  resolveGameAssetId,
  resolveGameAssetDetails,
  humanizeAssetName,
  enrichGameAssetRefs,
};
