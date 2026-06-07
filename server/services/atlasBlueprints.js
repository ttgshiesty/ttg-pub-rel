import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { BlueprintFind } from '../models/BlueprintFind.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_ATLAS_DATA_PATH =
  process.env.ATLAS_BLUEPRINTS_CSV_PATH?.trim() ||
  path.join(ROOT, 'shiestysource.csv');
let atlasBlueprintRowsCache = null;

export function normalizeAtlasBlueprintName(value = '') {
  return String(value || '')
    .trim()
    .replace(/\s+blueprint$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function parseAtlasCondition(value = '') {
  const raw = String(value || '').trim();
  const maps = [
    'Dam Battlegrounds',
    'Dam Battleground',
    'Buried City',
    'Blue Gate',
    'Spaceport Hidden',
    'Spaceport',
    'Stella Montis',
    'Stella',
    'All',
  ];
  const map = maps.find((name) =>
    raw.toLowerCase().startsWith(name.toLowerCase()),
  );
  const condition = map ? raw.slice(map.length).trim() || 'Any' : raw || 'Any';
  return {
    map:
      map === 'Dam Battleground'
        ? 'Dam Battlegrounds'
        : map === 'Stella Montis'
          ? 'Stella'
          : map || '',
    condition,
  };
}

export function atlasReportFromFind(find) {
  return {
    id: String(find._id),
    Blueprint: find.blueprintName,
    blueprint: find.blueprintName,
    map: find.map,
    condition: find.condition || 'Any',
    container: find.container || null,
    location_on_map: find.location || find.notes || null,
    behind_locked: find.locked ? 'Yes' : 'No',
    screenshot_url: find.blueprintImageUrl || null,
    discord_tag: find.userName || null,
    created_at: find.createdAt || find.updatedAt || new Date(),
    upvotes: find.votes?.up || 0,
    downvotes: find.votes?.down || 0,
  };
}

// Parse the atlas JSON file (format: window.SHIESTY_DATA = {...})
export async function loadAtlasBlueprintRows(
  dataPath = DEFAULT_ATLAS_DATA_PATH,
) {
  if (atlasBlueprintRowsCache) return atlasBlueprintRowsCache;
  const fileContent = await fs.readFile(dataPath, 'utf8');

  // Extract JSON from the JavaScript assignment format using brace counting
  // (regex fails on large nested JSON because it matches nested } too early)
  const prefix = 'window.SHIESTY_DATA';
  const startIdx = fileContent.indexOf(prefix);
  if (startIdx === -1) {
    throw new Error(
      'Invalid atlas data format: expected window.SHIESTY_DATA = {...}',
    );
  }

  // Find the opening brace after the assignment
  let braceStart = fileContent.indexOf('{', startIdx + prefix.length);
  if (braceStart === -1) {
    throw new Error('Invalid atlas data format: missing opening {');
  }

  // Walk forward counting braces to find the matching closing brace
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let jsonEnd = braceStart;
  for (let i = braceStart; i < fileContent.length; i++) {
    const ch = fileContent[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        jsonEnd = i;
        break;
      }
    }
  }

  const jsonStr = fileContent.slice(braceStart, jsonEnd + 1);
  const data = JSON.parse(jsonStr);
  const rows = data.rows || [];

  atlasBlueprintRowsCache = rows.map((row, index) => {
    const parsed = parseAtlasCondition(row['Map Condition'] || '');
    const lockedText = String(row['Behind Locked Door?'] || '');
    return {
      id: index + 1,
      Blueprint: row.Blueprint,
      blueprint: row.Blueprint,
      map: parsed.map,
      condition: parsed.condition,
      container: row.Container || null,
      location_on_map: row['Location on the map'] || null,
      behind_locked:
        lockedText && !/^no\b/i.test(lockedText) ? lockedText : 'No',
      created_at: new Date(0).toISOString(),
    };
  });
  return atlasBlueprintRowsCache;
}

export function clearAtlasBlueprintCache() {
  atlasBlueprintRowsCache = null;
}

export async function loadAtlasRowsWithMongo() {
  const rows = await loadAtlasBlueprintRows();
  if (mongoose.connection.readyState !== 1) {
    return rows;
  }
  const finds = await BlueprintFind.find({}).sort({ createdAt: -1 }).lean();
  return [...rows, ...finds.map(atlasReportFromFind)];
}

function pct(count, total) {
  return total > 0 ? (count / total) * 100 : 0;
}

function topEntries(map, limit = 10) {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function summarizeAtlasBlueprint(rows, blueprintName) {
  const key = normalizeAtlasBlueprintName(blueprintName);
  const matches = rows.filter(
    (row) => normalizeAtlasBlueprintName(row.blueprint || row.Blueprint) === key,
  );
  const total = matches.length;
  if (!total) return null;

  const byMap = new Map();
  const byCondition = new Map();
  const byContainer = new Map();
  const locationsByMap = new Map();
  let lockedYes = 0;
  let lockedKnown = 0;

  for (const row of matches) {
    const map = row.map || 'Unknown';
    const condition = row.condition || 'Any';
    const container = row.container || '';
    const location = row.location_on_map || row.location || '';
    const locked = String(row.behind_locked || '').toLowerCase();

    byMap.set(map, (byMap.get(map) || 0) + 1);
    byCondition.set(condition, (byCondition.get(condition) || 0) + 1);
    if (container.trim()) byContainer.set(container, (byContainer.get(container) || 0) + 1);

    if (location.trim()) {
      if (!locationsByMap.has(map)) locationsByMap.set(map, new Map());
      const mapLocations = locationsByMap.get(map);
      mapLocations.set(location, (mapLocations.get(location) || 0) + 1);
    }

    if (locked && !['unknown', 'unsure', ''].includes(locked)) {
      lockedKnown += 1;
      if (!locked.startsWith('no')) lockedYes += 1;
    }
  }

  const mapStats = topEntries(byMap, 20).map((entry) => ({
    ...entry,
    percent: pct(entry.count, total),
  }));
  const conditionStats = topEntries(byCondition, 20).map((entry) => ({
    ...entry,
    percent: pct(entry.count, total),
  }));
  const containerStats = topEntries(byContainer, 15).map((entry) => ({
    ...entry,
    percent: pct(entry.count, total),
  }));

  return {
    blueprint: matches[0].blueprint || matches[0].Blueprint || blueprintName,
    reports: total,
    bestMap: mapStats[0]?.name || 'Unknown',
    bestCondition: conditionStats[0]?.name || 'Any',
    lockedChance: lockedKnown ? pct(lockedYes, lockedKnown) : null,
    maps: mapStats,
    conditions: conditionStats,
    containers: containerStats,
    locationsByMap: mapStats.slice(0, 5).map((map) => ({
      map: map.name,
      reports: map.count,
      percent: map.percent,
      locations: topEntries(locationsByMap.get(map.name) || new Map(), 8),
    })),
  };
}

export async function getAtlasBlueprintSummary(blueprintName) {
  const rows = await loadAtlasRowsWithMongo();
  return summarizeAtlasBlueprint(rows, blueprintName);
}

export async function searchAtlasBlueprintSummaries(query, limit = 5) {
  const rows = await loadAtlasRowsWithMongo();
  const normalizedQuery = normalizeAtlasBlueprintName(query);
  if (!normalizedQuery) return [];

  const names = Array.from(
    new Set(rows.map((row) => row.blueprint || row.Blueprint).filter(Boolean)),
  );
  return names
    .filter((name) => normalizeAtlasBlueprintName(name).includes(normalizedQuery))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit)
    .map((name) => summarizeAtlasBlueprint(rows, name))
    .filter(Boolean);
}
