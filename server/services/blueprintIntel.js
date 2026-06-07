import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as csvParse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_CSV_PATH =
  process.env.BLUEPRINTS_CSV_PATH ||
  path.join(ROOT, 'arc_raiders_blueprints_final.csv');
const APPENDED_REPORTS_HEADER =
  'Blueprint,Map Condition,Behind Locked Door?,Container,Location on the map';

let cache = {
  path: '',
  mtimeMs: -1,
  rows: [],
  byKey: {},
};

export function normalizeBlueprintKey(value = '') {
  return String(value || '')
    .trim()
    .replace(/[_-]?blueprint$/i, '')
    .replace(/\s+blueprint$/i, '')
    .toLowerCase()
    .replace(/\bmagazine\b/g, 'mag')
    .replace(/[^a-z0-9]+/g, '');
}

export function blueprintSlugFromName(value = '') {
  return String(value || '')
    .trim()
    .replace(/\s+blueprint$/i, '')
    .replace(/\bmagazine\b/gi, 'mag')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function clean(value) {
  return String(value ?? '').trim();
}

function num(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowToIntel(row) {
  const name = clean(row.BlueprintName);
  const slug = blueprintSlugFromName(name);
  return {
    key: normalizeBlueprintKey(name),
    blueprintId: slug ? `${slug}_blueprint` : '',
    name,
    map: clean(row.Map),
    condition: clean(row.MapCondition),
    scavengable: clean(row.Scavengable),
    containers: clean(row.Containers),
    questReward: clean(row.QuestReward),
    trialsReward: clean(row.TrialsReward),
    containerType: clean(row.ContainerTypeAssumed),
    dropRatePerContainer: num(row.DropRateEstimate_PerContainer),
    avgRaids6: num(row.AvgRaidsEstimate_6Containers),
    avgRaids9: num(row.AvgRaidsEstimate_9Containers),
    notes: clean(row.Notes),
    locationNotes: clean(row.LocationNotes),
    bestRoute: clean(row.BestKnownRoute),
    craftingMaterials: clean(row.CraftingMaterials),
    workshopLevel: clean(row.WorkshopLevel),
  };
}

export function loadBlueprintIntel(csvPath = DEFAULT_CSV_PATH) {
  if (!fs.existsSync(csvPath)) {
    cache = { path: csvPath, mtimeMs: -1, rows: [], byKey: {} };
    return cache;
  }

  const stat = fs.statSync(csvPath);
  if (cache.path === csvPath && cache.mtimeMs === stat.mtimeMs) return cache;

  const content = fs.readFileSync(csvPath, 'utf8');
  const reportsIndex = content.indexOf(`\n${APPENDED_REPORTS_HEADER}`);
  const intelContent =
    reportsIndex === -1 ? content : content.slice(0, reportsIndex);
  const parsed = csvParse(intelContent, {
    columns: true,
    skip_empty_lines: true,
  });
  const rows = parsed.map(rowToIntel).filter((row) => row.name && row.key);
  const byKey = {};

  rows.forEach((row) => {
    byKey[row.key] = row;
    if (row.blueprintId) byKey[normalizeBlueprintKey(row.blueprintId)] = row;
  });

  cache = { path: csvPath, mtimeMs: stat.mtimeMs, rows, byKey };
  return cache;
}

export function getBlueprintIntel(value) {
  if (!value) return null;
  const { byKey } = loadBlueprintIntel();
  return byKey[normalizeBlueprintKey(value)] || null;
}

export function getBlueprintIntelMap() {
  const { rows } = loadBlueprintIntel();
  return Object.fromEntries(rows.map((row) => [row.key, row]));
}

export function listingBlueprintKey(listing) {
  const value =
    listing?.itemStats?.blueprintId ||
    listing?.blueprintId ||
    listing?.itemId ||
    listing?.itemName;
  return normalizeBlueprintKey(value);
}

export function isBlueprintListing(listing) {
  return (
    Boolean(listing?.itemStats?.blueprintId || listing?.blueprintId) ||
    String(listing?.itemType || '').toLowerCase() === 'blueprint' ||
    String(listing?.itemName || '')
      .toLowerCase()
      .includes('blueprint')
  );
}

export function summarizeBlueprintListings(listings = []) {
  const grouped = {};
  listings.filter(isBlueprintListing).forEach((listing) => {
    const key = listingBlueprintKey(listing);
    if (!key) return;
    const row =
      grouped[key] ||
      (grouped[key] = {
        key,
        count: 0,
        lowestPrice: null,
        listings: [],
      });
    const price = Number(listing.price);
    row.count += 1;
    if (Number.isFinite(price)) {
      row.lowestPrice =
        row.lowestPrice == null ? price : Math.min(row.lowestPrice, price);
    }
    row.listings.push({
      _id: String(listing._id),
      itemId: listing.itemId,
      itemName: listing.itemName,
      itemrarity: listing.itemrarity,
      itemIconUrl: listing.itemIconUrl,
      price: listing.price,
      currency: listing.currency,
      quantity: listing.itemQuantity,
      sellerName: listing.sellerName,
      createdAt: listing.createdAt,
    });
  });
  return grouped;
}
